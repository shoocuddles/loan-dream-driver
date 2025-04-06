
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminHeader from "@/components/AdminHeader";
import PricingSettings from "@/components/PricingSettings";
import AdminPasswordChange from "@/components/AdminPasswordChange";
import DealerManagement from "@/components/DealerManagement";
import { 
  getAllApplications, 
  getApplicationDetails, 
  unlockApplication,
  generateApplicationPDF
} from "@/lib/supabase";

const AdminDashboard = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("applications");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!isAdmin) {
      navigate('/dealers');
      return;
    }
    
    loadApplications();
  }, [navigate]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const allApps = await getAllApplications();
      // Format application data for display
      const formattedApps = allApps.map(app => ({
        ...app,
        applicationId: app.id, // Ensure ID is mapped correctly
        submissionDate: app.created_at // Map dates correctly
      }));
      setApplications(formattedApps);
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

  const handleDownload = async (applicationId: string) => {
    try {
      setProcessingId(applicationId);
      
      // Get application details
      const details = await getApplicationDetails(applicationId);
      
      // Generate and save PDF with admin flag set to true
      const pdf = generateApplicationPDF(details, true);
      pdf.save(`ontario-loans-admin-${applicationId}.pdf`);
      
      toast({
        title: "Download Complete",
        description: "The application details have been downloaded successfully.",
      });
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

  const handleUnlockApplication = async (applicationId: string) => {
    try {
      setProcessingId(`unlock-${applicationId}`);
      
      // Unlock the application
      await unlockApplication(applicationId);
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.applicationId === applicationId
            ? { ...app, isLocked: false, lockExpiresAt: null, lockedBy: null }
            : app
        )
      );
      
      toast({
        title: "Application Unlocked",
        description: "The application has been unlocked successfully.",
      });
    } catch (error) {
      console.error("Unlock error:", error);
      toast({
        title: "Unlock Failed",
        description: "There was a problem unlocking the application.",
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
          <AdminHeader />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="dealers">Dealer Management</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="applications">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6">All Applications</h2>
                
                {loading ? (
                  <p className="text-center py-8 text-gray-500">Loading applications...</p>
                ) : applications.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No applications have been submitted yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-ontario-blue text-white">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Client Name</th>
                          <th className="px-4 py-3 text-left">Email</th>
                          <th className="px-4 py-3 text-left">City</th>
                          <th className="px-4 py-3 text-left">Vehicle Type</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app.applicationId} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {new Date(app.submissionDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">{app.fullName}</td>
                            <td className="px-4 py-3">{app.email}</td>
                            <td className="px-4 py-3">{app.city || "N/A"}</td>
                            <td className="px-4 py-3">{app.vehicleType}</td>
                            <td className="px-4 py-3 text-center">
                              {app.isLocked && (
                                <div>
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                    Locked
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Until: {new Date(app.lockExpiresAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center items-center space-x-2">
                                <Button
                                  onClick={() => handleDownload(app.applicationId)}
                                  disabled={processingId === app.applicationId}
                                  className="bg-ontario-blue hover:bg-ontario-blue/90"
                                  size="sm"
                                >
                                  {processingId === app.applicationId ? "Processing..." : "Download PDF"}
                                </Button>
                                
                                {app.isLocked && (
                                  <Button
                                    onClick={() => handleUnlockApplication(app.applicationId)}
                                    disabled={processingId === `unlock-${app.applicationId}`}
                                    variant="outline"
                                    size="sm"
                                    className="border-red-500 text-red-500 hover:bg-red-50"
                                  >
                                    {processingId === `unlock-${app.applicationId}` ? "Unlocking..." : "Unlock"}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="dealers" className="h-full">
              <DealerManagement />
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PricingSettings />
                <AdminPasswordChange />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
