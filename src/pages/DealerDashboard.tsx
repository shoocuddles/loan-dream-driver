import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ApplicationItem, DownloadedApplication, LockType, LockoutPeriod, SystemSettings } from '@/lib/types/dealer-dashboard';
import DealerDashboardLayout from '@/components/DealerDashboardLayout';
import ApplicationTable from '@/components/application-table/ApplicationTable';
import DownloadedApplications from '@/components/DownloadedApplications';
import DealerProfile from '@/components/DealerProfile';
import PaymentSettings from '@/components/PaymentSettings';
import BulkActionsBar from '@/components/BulkActionsBar';
import ApplicationDetails from '@/components/ApplicationDetails';
import { useSearchParams } from 'react-router-dom';
import { 
  fetchAvailableApplications,
  fetchDownloadedApplications,
  lockApplication,
  unlockApplication,
  recordDownload,
  fetchLockoutPeriods,
} from '@/lib/services';
import {
  createCheckoutSession,
  completePurchase
} from '@/lib/services/stripe/stripeService';

const generateApplicationPDF = (application: { 
  id: string; 
  fullName: string; 
  created_at: string;
  status: string;
}) => {
  console.log('Generating PDF for application:', application);
  
  const text = `
    Application ID: ${application.id}
    Name: ${application.fullName}
    Date: ${new Date(application.created_at).toLocaleDateString()}
    Status: ${application.status}
  `;
  
  return new Blob([text], { type: 'application/pdf' });
};

const DealerDashboard = () => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [downloadedApps, setDownloadedApps] = useState<DownloadedApplication[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDownloaded, setIsLoadingDownloaded] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'download' | 'lock';
    applicationIds: string[];
    lockType?: LockType;
  } | null>(null);
  const [detailsApplication, setDetailsApplication] = useState<ApplicationItem | DownloadedApplication | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lockOptions, setLockOptions] = useState<{ id: number, name: string, type: LockType, fee: number }[]>([
    { id: 1, name: '24 Hours', type: '24hours', fee: 4.99 },
    { id: 2, name: '1 Week', type: '1week', fee: 9.99 },
    { id: 3, name: 'Permanent', type: 'permanent', fee: 29.99 }
  ]);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('payment_success') === 'true';
  const paymentCancelled = searchParams.get('payment_cancelled') === 'true';
  const sessionId = searchParams.get('session_id');

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
      loadLockOptions();
    }
  }, [user]);
  
  useEffect(() => {
    const handlePaymentResult = async () => {
      const shouldClearParams = paymentSuccess || paymentCancelled;
      
      if (paymentSuccess && sessionId) {
        try {
          toast.loading("Verifying your purchase...");
          const result = await completePurchase(sessionId);
          
          if (result.error) {
            console.error("Error completing purchase:", result.error);
            toast.error("There was an issue processing your payment confirmation. Please contact support.");
          } else {
            toast.success("Payment processed successfully. Your applications are now available.");
            await loadData();
          }
        } catch (error) {
          console.error("Exception completing purchase:", error);
          toast.error("An unexpected error occurred while processing your payment confirmation.");
        } finally {
          toast.dismiss();
        }
      } else if (paymentSuccess) {
        toast.success("Payment processed successfully. Your applications are now available.");
        await loadData();
      } else if (paymentCancelled) {
        toast.info("Payment was cancelled. You can try again when you're ready.");
      }
      
      if (shouldClearParams) {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('payment_success');
          newParams.delete('payment_cancelled');
          newParams.delete('session_id');
          return newParams;
        });
      }
    };
    
    if (paymentSuccess || paymentCancelled) {
      handlePaymentResult();
    }
  }, [paymentSuccess, paymentCancelled, sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadingDownloaded(true);
    
    try {
      const appsData = await fetchAvailableApplications();
      console.log('Loaded applications with lock info:', appsData.map(app => ({
        id: app.applicationId,
        lockInfo: app.lockInfo
      })));
      setApplications(appsData);

      const downloadedData = await fetchDownloadedApplications();
      setDownloadedApps(Array.isArray(downloadedData) ? downloadedData : []);
      
      if (!Array.isArray(downloadedData)) {
        console.error("Downloaded applications data is not an array:", downloadedData);
        toast.error("Error loading downloaded applications data");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
      setDownloadedApps([]);
    } finally {
      setIsLoading(false);
      setIsLoadingDownloaded(false);
    }
  };

  const loadLockOptions = async () => {
    try {
      const periods = await fetchLockoutPeriods();
      
      if (periods.length > 0) {
        setLockOptions(periods.map(period => ({
          id: period.id,
          name: period.name,
          type: period.name === '24 Hours' 
            ? '24hours' 
            : period.name === '1 Week' 
              ? '1week' 
              : 'permanent',
          fee: period.fee
        })));
      }
    } catch (error) {
      console.error("Error loading lock options:", error);
    }
  };

  const handleViewDetails = (application: ApplicationItem | DownloadedApplication) => {
    setDetailsApplication(application);
    setShowDetails(true);
  };

  const handleLockApplication = async (applicationId: string, lockType: LockType) => {
    if (!user) return;

    try {
      setProcessingId(applicationId);
      
      if (lockType !== 'temporary') {
        setPendingAction({
          type: 'lock',
          applicationIds: [applicationId],
          lockType
        });
        setShowPaymentDialog(true);
        return;
      }

      const success = await lockApplication(applicationId, lockType);

      if (success) {
        toast.success(`Application temporarily locked for 2 minutes`);
        loadData();
      } else {
        toast.error("Failed to lock application. Please try again.");
      }
    } catch (error: any) {
      console.error("Error locking application:", error);
      toast.error("An error occurred while locking the application.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnlockApplication = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      const success = await unlockApplication(applicationId);

      if (success) {
        toast.success("Application unlocked successfully");
        loadData();
      } else {
        toast.error("Failed to unlock application. Please try again.");
      }
    } catch (error: any) {
      console.error("Error unlocking application:", error);
      toast.error("An error occurred while unlocking the application.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownload = async (applicationId: string) => {
    if (!user) return;

    try {
      setProcessingId(applicationId);
      
      const isDownloaded = Array.isArray(downloadedApps) && downloadedApps.some(app => app.applicationId === applicationId);
      
      if (!isDownloaded) {
        setPendingAction({
          type: 'download',
          applicationIds: [applicationId]
        });
        setShowPaymentDialog(true);
        return;
      }
      
      toast.success("Application is available for viewing");
    } catch (error: any) {
      console.error("Error downloading application:", error);
      toast.error("An error occurred while downloading the application.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkDownload = async () => {
    if (!user || selectedApplications.length === 0) return;

    const notDownloaded = Array.isArray(downloadedApps) ? 
      selectedApplications.filter(id => !downloadedApps.some(app => app.applicationId === id)) :
      selectedApplications;

    if (notDownloaded.length > 0) {
      setPendingAction({
        type: 'download',
        applicationIds: notDownloaded
      });
      setShowPaymentDialog(true);
    } else {
      toast.success(`All selected applications are already purchased and available for download`);
    }
  };

  const handleBulkLock = async (lockType: LockType) => {
    if (!user || selectedApplications.length === 0) return;

    setPendingAction({
      type: 'lock',
      applicationIds: selectedApplications,
      lockType
    });
    setShowPaymentDialog(true);
  };

  const handleProcessPayment = async () => {
    if (!pendingAction) return;
    setIsProcessingPayment(true);

    try {
      if (pendingAction.type === 'download') {
        toast.loading("Creating checkout session...");
        
        const response = await createCheckoutSession({
          applicationIds: pendingAction.applicationIds,
          priceType: 'standard'
        });
        
        if (response.error) {
          console.error('Error response from checkout session:', response.error);
          
          if (response.error.message && response.error.message.includes('already purchased')) {
            toast.success("All selected applications have already been purchased");
            await loadData();
            setShowPaymentDialog(false);
            setPendingAction(null);
            return;
          }
          
          throw new Error(response.error.message);
        }
        
        if (response.data?.url) {
          toast.success("Checkout session created. Redirecting to payment page...");
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          window.location.href = response.data.url;
          return;
        } else {
          throw new Error('No checkout URL returned from Stripe');
        }
      } else if (pendingAction.type === 'lock' && pendingAction.lockType) {
        toast.loading(`Locking ${pendingAction.applicationIds.length} application(s)...`);
        
        for (const appId of pendingAction.applicationIds) {
          await lockApplication(appId, pendingAction.lockType);
        }
        
        toast.success(`${pendingAction.applicationIds.length} application(s) locked`);
        await loadData();
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(`Failed to process payment: ${error.message || "Unknown error"}`, {
        description: "Please check the console for more details and try again later."
      });
    } finally {
      toast.dismiss();
      setShowPaymentDialog(false);
      setPendingAction(null);
      setIsProcessingPayment(false);
    }
  };

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = (select: boolean) => {
    if (select) {
      const selectableApps = applications
        .filter(app => !app.lockInfo?.isLocked || app.lockInfo?.isOwnLock)
        .map(app => app.applicationId);
      setSelectedApplications(selectableApps);
    } else {
      setSelectedApplications([]);
    }
  };

  const getUnpurchasedApplications = () => {
    if (!Array.isArray(downloadedApps) || !Array.isArray(selectedApplications)) {
      return [];
    }
    
    return selectedApplications.filter(id => 
      !downloadedApps.some(app => app.applicationId === id)
    );
  };
  
  const calculateTotalPurchaseCost = (appIds: string[]) => {
    if (!appIds.length) return 0;
    
    let total = 0;
    appIds.forEach(id => {
      const app = applications.find(a => a.applicationId === id);
      if (app) {
        const isDiscounted = app.lockInfo?.isLocked && !app.lockInfo?.isOwnLock;
        total += isDiscounted 
          ? (app.discountedPrice || 5.99) 
          : (app.standardPrice || 10.99);
      }
    });
    
    return total;
  };

  return (
    <DealerDashboardLayout
      availableApplications={
        <>
          <Card>
            <CardHeader>
              <CardTitle>Available Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationTable
                applications={applications}
                isLoading={isLoading}
                selectedApplications={selectedApplications}
                toggleApplicationSelection={toggleApplicationSelection}
                selectAll={handleSelectAll}
                onLock={handleLockApplication}
                onUnlock={handleUnlockApplication}
                onDownload={handleDownload}
                onViewDetails={handleViewDetails}
                processingId={processingId}
                lockOptions={lockOptions}
              />
              
              <BulkActionsBar
                selectedCount={selectedApplications.length}
                onBulkDownload={handleBulkDownload}
                onBulkLock={handleBulkLock}
                onClearSelection={() => setSelectedApplications([])}
                isProcessing={!!processingId}
                selectedApplicationIds={selectedApplications}
                unpurchasedCount={getUnpurchasedApplications().length}
                totalPurchaseCost={calculateTotalPurchaseCost(getUnpurchasedApplications())}
                onPurchaseSelected={handleBulkPurchase}
              />
              
              <div className="mt-6 text-sm text-gray-500">
                <p>
                  Note: You will be charged for each new application download. 
                  Previously downloaded applications can be accessed for free.
                  Applications that have been recently downloaded by other dealers 
                  will be available at a discounted rate.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <ApplicationDetails
            application={detailsApplication as ApplicationItem}
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            isDownloaded={Array.isArray(downloadedApps) && downloadedApps.some(app => app.applicationId === detailsApplication?.applicationId)}
            onDownload={handleDownload}
            onLock={handleLockApplication}
            onUnlock={handleUnlockApplication}
            isProcessing={processingId === detailsApplication?.applicationId}
            selectedApplicationIds={detailsApplication ? [detailsApplication.applicationId] : []}
          />
          
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                  {pendingAction?.type === 'download' 
                    ? `You're about to purchase ${pendingAction.applicationIds.length} application(s).`
                    : `You're about to lock ${pendingAction?.applicationIds.length} application(s).`
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-t border-b py-3">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>${calculateTotalPurchaseCost(getUnpurchasedApplications()).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowPaymentDialog(false)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-ontario-blue hover:bg-ontario-blue/90"
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Your payment will be processed securely through Stripe
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      }
      downloadedApplications={
        <DownloadedApplications
          applications={Array.isArray(downloadedApps) ? downloadedApps : []}
          isLoading={isLoadingDownloaded}
          onDownload={handleDownload}
          onViewDetails={handleViewDetails}
        />
      }
      profile={<DealerProfile />}
      payment={<PaymentSettings />}
    />
  );
};

export default DealerDashboard;
