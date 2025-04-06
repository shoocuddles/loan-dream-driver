
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminHeader from "@/components/AdminHeader";
import PricingSettings from "@/components/PricingSettings";
import AdminPasswordChange from "@/components/AdminPasswordChange";
import CompanyPricingSettings from "@/components/CompanyPricingSettings";
import DealerManagement from "@/components/DealerManagement";
import DealerPurchases from "@/components/DealerPurchases";
import { SortableTable, ColumnDef } from "@/components/ui/sortable-table";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Unlock } from 'lucide-react';
import { 
  getAllApplications, 
  getApplicationDetails, 
  unlockApplication,
  generateApplicationPDF
} from "@/lib/supabase";

// Application type definition
interface ApplicationItem {
  applicationId: string;
  fullName: string;
  email: string;
  city: string;
  vehicleType: string;
  submissionDate: string;
  status: string;
  isLocked?: boolean;
  lockExpiresAt?: string;
  lockedBy?: string;
}

const AdminDashboard = () => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
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
        applicationId: app.id, // Ensure ID is mapped correctly
        fullName: app.fullName || app.fullname || 'Unknown',
        email: app.email || 'N/A',
        city: app.city || 'N/A',
        vehicleType: app.vehicleType || app.vehicletype || 'N/A',
        submissionDate: app.created_at, // Map dates correctly
        status: app.status || 'pending',
        isLocked: app.isLocked,
        lockExpiresAt: app.lockExpiresAt,
        lockedBy: app.lockedBy
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
      
      if (!details) {
        throw new Error("Application details not found");
      }
      
      // Generate PDF with admin flag set to true
      const pdfBlob = generateApplicationPDF(details, true);
      
      // Create a URL for the Blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `ontario-loans-admin-${applicationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
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

  const handleViewDetails = (applicationId: string) => {
    // Placeholder for view details functionality
    toast({
      title: "View Details",
      description: `Viewing details for application ${applicationId}`,
    });
  };

  // Define columns for the applications table
  const applicationColumns: ColumnDef<ApplicationItem>[] = [
    {
      accessorKey: 'submissionDate',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.original.submissionDate);
        return date.toLocaleDateString();
      }
    },
    {
      accessorKey: 'fullName',
      header: 'Client Name',
      cell: ({ row }) => <div className="font-medium">{row.original.fullName}</div>
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'city',
      header: 'City',
    },
    {
      accessorKey: 'vehicleType',
      header: 'Vehicle Type',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        if (row.original.isLocked) {
          return (
            <div>
              <Badge variant="destructive" className="px-2 py-1 text-xs">
                Locked
              </Badge>
              {row.original.lockExpiresAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Until: {new Date(row.original.lockExpiresAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          );
        }
        return <Badge variant="outline">{row.original.status}</Badge>;
      }
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const app = row.original;
        return (
          <div className="flex justify-center items-center space-x-2">
            <Button
              onClick={() => handleViewDetails(app.applicationId)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => handleDownload(app.applicationId)}
              disabled={processingId === app.applicationId}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {app.isLocked && (
              <Button
                onClick={() => handleUnlockApplication(app.applicationId)}
                disabled={processingId === `unlock-${app.applicationId}`}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <Unlock className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <AdminHeader />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="purchases">Dealer Purchases</TabsTrigger>
              <TabsTrigger value="dealers">Dealer Management</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
              <TabsTrigger value="company-pricing">Company Pricing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="applications">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6">All Applications</h2>
                
                <SortableTable
                  data={applications}
                  columns={applicationColumns}
                  isLoading={loading}
                  noDataMessage="No applications have been submitted yet."
                />
              </div>
            </TabsContent>

            <TabsContent value="purchases">
              <DealerPurchases />
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

            <TabsContent value="company-pricing">
              <CompanyPricingSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
