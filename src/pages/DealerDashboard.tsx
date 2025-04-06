import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DealerHeader from "@/components/DealerHeader";
import ApplicationList from "@/components/ApplicationList";
import PaymentSettings from "@/components/PaymentSettings";
import { 
  getApplicationsList, 
  getApplicationDetails, 
  recordDownload, 
  lockApplication,
  checkApplicationLock,
  signOutDealer, 
  supabase,
  generateApplicationPDF,
  generateApplicationsCSV,
  DEFAULT_SETTINGS
} from "@/lib/supabase";
import { Application, ApplicationLock } from "@/lib/types/supabase";

const DealerDashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [hideDownloaded, setHideDownloaded] = useState(false);
  const [downloadedApps, setDownloadedApps] = useState<string[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate('/dealers');
          return;
        }
        
        // Check if the user is an admin and redirect if needed
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
          navigate('/admin-dashboard');
          return;
        }
        
        loadApplications();
        loadDownloadHistory();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate('/dealers');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const loadDownloadHistory = async () => {
    try {
      // In a real implementation, we would fetch this from Supabase
      // For now, let's use localStorage as a mock implementation
      const downloadHistory = localStorage.getItem('downloadedApplications');
      if (downloadHistory) {
        setDownloadedApps(JSON.parse(downloadHistory));
      }
    } catch (error) {
      console.error("Error loading download history:", error);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const appList = await getApplicationsList();
      
      // Process applications to mark those that were previously locked
      const processedApps = appList.map((app: Application) => ({
        ...app,
        // Ensure applicationId is set for compatibility with existing code
        applicationId: app.id,
        wasLocked: app.lockedBy && !app.isLocked && app.lockedBy !== 'currentDealerId'
      }));
      
      setApplications(processedApps);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast({
        title: "Error",
        description: "Unable to load applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleMultipleDownload = async (format: 'pdf' | 'csv') => {
    if (selectedApplications.length === 0) {
      toast({
        title: "No Applications Selected",
        description: "Please select at least one application to download.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setProcessingId('multiple');
      
      // Get details for all selected applications
      const selectedApps = await Promise.all(
        selectedApplications.map(id => getApplicationDetails(id))
      );
      
      // Filter out any null values (applications that could not be retrieved)
      const validApps = selectedApps.filter(app => app !== null) as Application[];
      
      // Calculate total cost based on application status
      let totalCost = 0;
      const newDownloads = [];
      
      for (const app of validApps) {
        // Check if the application is already downloaded
        if (!downloadedApps.includes(app.id)) {
          // Check lock status and pricing
          const lockStatus = await checkApplicationLock(app.id);
          
          if (lockStatus && (lockStatus as ApplicationLock).isLocked) {
            // Skip this application if it's locked by someone else
            toast({
              title: "Application Locked",
              description: `Application ${app.id} is currently locked and cannot be downloaded.`,
              variant: "destructive",
            });
            continue;
          }
          
          // For simplicity, use standard price since we don't have the full pricing logic
          totalCost += DEFAULT_SETTINGS.standardPrice;
          newDownloads.push(app.id);
        }
      }
      
      // If there are new downloads with a cost
      if (newDownloads.length > 0 && totalCost > 0) {
        // In a real app, we would process payment via Stripe here
        toast({
          title: "Processing Payment",
          description: `Charging $${totalCost.toFixed(2)} for ${newDownloads.length} new applications.`
        });
        
        // Process payment (mock)
        const paymentSuccess = true;
        
        if (!paymentSuccess) {
          toast({
            title: "Payment Failed",
            description: "Unable to process payment. Please try again or update your payment method.",
            variant: "destructive",
          });
          return;
        }
        
        // Record downloads
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("User not found");
        
        for (const appId of newDownloads) {
          // Lock application for other dealers
          await lockApplication(appId, data.user.id);
          
          // Record the download
          await recordDownload(appId, data.user.id);
        }
        
        // Update local download history
        const updatedDownloads = [...downloadedApps, ...newDownloads];
        setDownloadedApps(updatedDownloads);
        localStorage.setItem('downloadedApplications', JSON.stringify(updatedDownloads));
      }
      
      // Generate and download the file
      if (format === 'pdf') {
        // For multiple PDFs, create one and then combine
        for (const app of validApps) {
          const pdf = generateApplicationPDF(app);
          pdf.save(`ontario-loans-application-${app.id}.pdf`);
        }
      } else {
        // Generate CSV
        const csvContent = generateApplicationsCSV(validApps);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `ontario-loans-applications-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${validApps.length} applications.`
      });
      
      // Clear selection
      setSelectedApplications([]);
      
      // Refresh applications to show updated lock status
      loadApplications();
    } catch (error) {
      console.error("Multiple download error:", error);
      toast({
        title: "Download Failed",
        description: "There was a problem downloading the applications.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownload = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      
      // Check if the application is locked
      const lockStatus = await checkApplicationLock(applicationId);
      
      if (lockStatus && (lockStatus as ApplicationLock).isLocked) {
        const canDownload = false; // Simplified logic
        if (!canDownload) {
          toast({
            title: "Application Locked",
            description: "This application is currently being processed by another dealer and cannot be downloaded at this time.",
            variant: "destructive",
          });
          setProcessingId(null);
          return;
        }
      }
      
      // Determine payment amount based on download history and lock status
      const price = DEFAULT_SETTINGS.standardPrice; // Simplified pricing
      const needsPayment = !downloadedApps.includes(applicationId);
      
      // If payment is needed
      if (needsPayment) {
        // In a real app, we would process payment via Stripe here
        toast({
          title: "Processing Payment",
          description: `Charging $${price.toFixed(2)} for this application download.`
        });
        
        // Process payment (mock)
        const paymentSuccess = true;
        
        if (!paymentSuccess) {
          toast({
            title: "Payment Failed",
            description: "Unable to process payment. Please try again or update your payment method.",
            variant: "destructive",
          });
          setProcessingId(null);
          return;
        }
      }
      
      // Get application details
      const details = await getApplicationDetails(applicationId);
      if (!details) {
        toast({
          title: "Error",
          description: "Unable to retrieve application details.",
          variant: "destructive",
        });
        setProcessingId(null);
        return;
      }
      
      // Lock application for other dealers if this is a new download
      if (!downloadedApps.includes(applicationId)) {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("User not found");
        
        await lockApplication(applicationId, data.user.id);
      }
      
      // Record the download if payment was processed
      if (needsPayment) {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("User not found");
        
        await recordDownload(applicationId, data.user.id);
      }
      
      // Add to local download history if it's not already there
      if (!downloadedApps.includes(applicationId)) {
        const updatedDownloads = [...downloadedApps, applicationId];
        setDownloadedApps(updatedDownloads);
        localStorage.setItem('downloadedApplications', JSON.stringify(updatedDownloads));
      }
      
      // Generate PDF
      const pdf = generateApplicationPDF(details);
      
      // Save PDF
      pdf.save(`ontario-loans-application-${applicationId}.pdf`);
      
      toast({
        title: "Download Complete",
        description: "The application details have been downloaded successfully.",
      });
      
      // Refresh applications to show updated lock status
      loadApplications();
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "There was a problem downloading the application details.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <DealerHeader />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <ApplicationList
                applications={applications}
                downloadedApps={downloadedApps}
                hideDownloaded={hideDownloaded}
                setHideDownloaded={setHideDownloaded}
                processingId={processingId}
                handleDownload={handleDownload}
                handleMultipleDownload={handleMultipleDownload}
                toggleApplicationSelection={toggleApplicationSelection}
                selectedApplications={selectedApplications}
              />
            </div>
            
            <div>
              <PaymentSettings />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DealerDashboard;
