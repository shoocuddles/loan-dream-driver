
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ApplicationItem, DownloadedApplication, LockType } from '@/lib/types/dealer-dashboard';
import { generateApplicationPDF } from '@/lib/supabase';
import DealerDashboardLayout from '@/components/DealerDashboardLayout';
import ApplicationTable from '@/components/ApplicationTable';
import DownloadedApplications from '@/components/DownloadedApplications';
import DealerProfile from '@/components/DealerProfile';
import PaymentSettings from '@/components/PaymentSettings';
import BulkActionsBar from '@/components/BulkActionsBar';
import ApplicationDetails from '@/components/ApplicationDetails';
import { 
  fetchAvailableApplications,
  fetchDownloadedApplications,
  lockApplication,
  unlockApplication,
  recordDownload,
  fetchLockoutPeriods,
} from '@/lib/dealerService';

const DealerDashboard = () => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [downloadedApps, setDownloadedApps] = useState<DownloadedApplication[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDownloaded, setIsLoadingDownloaded] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
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
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
      loadLockOptions();
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadingDownloaded(true);
    
    try {
      const appsData = await fetchAvailableApplications();
      setApplications(appsData);

      const downloadedData = await fetchDownloadedApplications();
      setDownloadedApps(downloadedData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
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
        // For paid locks, set up pending action for payment
        setPendingAction({
          type: 'lock',
          applicationIds: [applicationId],
          lockType
        });
        setShowPaymentDialog(true);
        return;
      }

      // For temporary locks, proceed immediately
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
      
      // Check if the application is already downloaded by this dealer
      const isDownloaded = downloadedApps.some(app => app.applicationId === applicationId);
      
      if (!isDownloaded) {
        // If not downloaded, set up pending action for payment
        setPendingAction({
          type: 'download',
          applicationIds: [applicationId]
        });
        setShowPaymentDialog(true);
        return;
      }
      
      // For already downloaded applications, download directly
      const application = applications.find(app => app.applicationId === applicationId) || 
                          downloadedApps.find(app => app.applicationId === applicationId);
      
      if (!application) {
        toast.error("Application not found");
        return;
      }
      
      // Generate and download PDF
      const pdfBlob = generateApplicationPDF({
        id: application.applicationId,
        fullName: application.fullName,
        created_at: application.submissionDate || new Date().toISOString(),
        status: 'submitted'
      });
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `application_${application.applicationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Application downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading application:", error);
      toast.error("An error occurred while downloading the application.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkDownload = async () => {
    if (!user || selectedApplications.length === 0) return;

    // Check if all selected applications are already downloaded
    const notDownloaded = selectedApplications.filter(
      id => !downloadedApps.some(app => app.applicationId === id)
    );

    if (notDownloaded.length > 0) {
      // If any not downloaded, set up pending action for payment
      setPendingAction({
        type: 'download',
        applicationIds: selectedApplications
      });
      setShowPaymentDialog(true);
    } else {
      // If all already downloaded, download all PDFs
      try {
        for (const appId of selectedApplications) {
          const application = applications.find(app => app.applicationId === appId) || 
                              downloadedApps.find(app => app.applicationId === appId);
          
          if (!application) continue;
          
          const pdfBlob = generateApplicationPDF({
            id: application.applicationId,
            fullName: application.fullName,
            created_at: application.submissionDate || new Date().toISOString(),
            status: 'submitted'
          });
          
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `application_${application.applicationId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        toast.success(`${selectedApplications.length} applications downloaded`);
        setSelectedApplications([]);
      } catch (error) {
        console.error("Error in bulk download:", error);
        toast.error("Failed to download some applications");
      }
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

    try {
      setShowPaymentDialog(false);
      
      if (pendingAction.type === 'download') {
        // Simulate payment processing (this would integrate with Stripe)
        toast.success("Payment processed successfully");
        
        // Record downloads for each application
        for (const appId of pendingAction.applicationIds) {
          await recordDownload(appId);
        }
        
        toast.success(`${pendingAction.applicationIds.length} application(s) purchased`);
        
        // Clear selection and reload data
        setSelectedApplications([]);
        await loadData();
      } else if (pendingAction.type === 'lock' && pendingAction.lockType) {
        // Simulate payment processing for locks
        toast.success("Payment processed successfully");
        
        // Create locks for each application
        for (const appId of pendingAction.applicationIds) {
          await lockApplication(appId, pendingAction.lockType);
        }
        
        toast.success(`${pendingAction.applicationIds.length} application(s) locked`);
        
        // Clear selection and reload data
        setSelectedApplications([]);
        await loadData();
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setPendingAction(null);
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
      // Only select applications that aren't locked by others
      const selectableApps = applications
        .filter(app => !app.lockInfo?.isLocked || app.lockInfo?.isOwnLock)
        .map(app => app.applicationId);
      setSelectedApplications(selectableApps);
    } else {
      setSelectedApplications([]);
    }
  };

  // Find appropriate price for the payment dialog
  const calculateTotalPrice = () => {
    if (!pendingAction) return 0;
    
    let total = 0;
    
    // For downloads
    if (pendingAction.type === 'download') {
      for (const appId of pendingAction.applicationIds) {
        const app = applications.find(a => a.applicationId === appId);
        if (!app) continue;
        
        // If already downloaded, it's free
        if (downloadedApps.some(d => d.applicationId === appId)) {
          continue;
        }
        
        // If previously locked by someone else but not downloaded by current user
        const wasLocked = app.lockInfo?.isLocked && !app.lockInfo?.isOwnLock;
        total += wasLocked ? (app.discountedPrice || 5.99) : (app.standardPrice || 10.99);
      }
    }
    
    // For locks
    if (pendingAction.type === 'lock' && pendingAction.lockType) {
      const option = lockOptions.find(o => o.type === pendingAction.lockType);
      if (option) {
        total += option.fee * pendingAction.applicationIds.length;
      }
    }
    
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
            isDownloaded={downloadedApps.some(app => app.applicationId === detailsApplication?.applicationId)}
            onDownload={handleDownload}
            onLock={handleLockApplication}
            onUnlock={handleUnlockApplication}
            isProcessing={processingId === detailsApplication?.applicationId}
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
                    <span>${calculateTotalPrice().toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowPaymentDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-ontario-blue hover:bg-ontario-blue/90"
                    onClick={handleProcessPayment}
                  >
                    Process Payment
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
          applications={downloadedApps}
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
