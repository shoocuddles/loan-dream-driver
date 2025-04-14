import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminHeader from "@/components/AdminHeader";
import PricingSettings from "@/components/PricingSettings";
import StripeSettings from "@/components/StripeSettings";
import AdminPasswordChange from "@/components/AdminPasswordChange";
import CompanyPricingSettings from "@/components/CompanyPricingSettings";
import DealerManagement from "@/components/DealerManagement";
import DealerPurchases from "@/components/DealerPurchases";
import MailgunSettings from "@/components/MailgunSettings";
import { SortableTable, ColumnDef } from "@/components/ui/sortable-table";
import { Badge } from "@/components/ui/badge";
import { Eye, Unlock } from 'lucide-react';
import { 
  getAllApplications, 
  getApplicationDetails, 
  unlockApplication
} from "@/lib/supabase";
import { fetchSystemSettings } from "@/lib/services/settings/settingsService";
import { isValid, parseISO, format } from 'date-fns';
import DownloadOptions from "@/components/application-table/DownloadOptions";
import CsvUploader from "@/components/CsvUploader";
import { AgeDiscountSettings } from "@/components/application-table/priceUtils";
import { setupEmailLogCapture } from "@/lib/emailLogger";
import { setupEmailNotificationListener, testRealtimeConnection, testDatabaseTrigger } from "@/lib/emailNotificationListener";

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
  const [ageDiscountSettings, setAgeDiscountSettings] = useState<AgeDiscountSettings>({
    isEnabled: false,
    daysThreshold: 30,
    discountPercentage: 25
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const safeFormatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      
      const date = parseISO(dateString);
      
      if (!isValid(date)) return 'Invalid date';
      
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!isAdmin) {
      navigate('/dealers');
      return;
    }
    
    loadApplications();
    loadSettings();
    setupEmailLogCapture();
    
    testRealtimeConnection().then(isConnected => {
      if (isConnected) {
        console.log("✅ Realtime connection is working properly");
        
        testDatabaseTrigger().then(success => {
          if (success) {
            console.log("✅ Database trigger for notifications is working properly");
          } else {
            console.warn("⚠️ Database trigger test failed");
            toast({
              title: "Database Trigger Issue",
              description: "Automatic notifications via database trigger may not work. Please check logs.",
              variant: "destructive",
            });
          }
        });
      } else {
        console.warn("⚠️ Realtime connection test failed");
        toast({
          title: "Realtime Connection Issue",
          description: "Automatic notifications may not work. Please contact support.",
          variant: "destructive",
        });
      }
    });
    
    const unsubscribe = setupEmailNotificationListener();
    
    return () => {
      unsubscribe();
    };
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const settings = await fetchSystemSettings();
      if (settings && settings.ageDiscountEnabled) {
        setAgeDiscountSettings({
          isEnabled: settings.ageDiscountEnabled,
          daysThreshold: settings.ageDiscountThreshold || 30,
          discountPercentage: settings.ageDiscountPercentage || 25
        });
        console.log("Loaded age discount settings:", {
          isEnabled: settings.ageDiscountEnabled,
          daysThreshold: settings.ageDiscountThreshold,
          discountPercentage: settings.ageDiscountPercentage
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const allApps = await getAllApplications();
      const formattedApps = allApps.map(app => ({
        applicationId: app.id,
        fullName: app.fullName || app.fullname || 'Unknown',
        email: app.email || 'N/A',
        city: app.city || 'N/A',
        vehicleType: app.vehicleType || app.vehicletype || 'N/A',
        submissionDate: app.created_at,
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

  const handleUnlockApplication = async (applicationId: string) => {
    try {
      setProcessingId(`unlock-${applicationId}`);
      
      await unlockApplication(applicationId);
      
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
    toast({
      title: "View Details",
      description: `Viewing details for application ${applicationId}`,
    });
  };

  const handleUploadSuccess = (count: number) => {
    loadApplications();
  };

  const applicationColumns: ColumnDef<ApplicationItem>[] = [
    {
      accessorKey: 'submissionDate',
      header: 'Date',
      cell: ({ row }) => {
        return safeFormatDate(row.original.submissionDate);
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

            <DownloadOptions
              applicationIds={[app.applicationId]}
              isProcessing={processingId === app.applicationId}
              variant="ghost"
              size="icon"
            />
            
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
      
      <main className="flex-grow py-12 bg-ontario-gray pt-[75px]">
        <div className="container mx-auto px-4">
          <AdminHeader />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="mb-6">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="purchases">Dealer Purchases</TabsTrigger>
              <TabsTrigger value="dealers">Dealer Management</TabsTrigger>
              <TabsTrigger value="upload">Upload Apps</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
              <TabsTrigger value="stripe">Stripe Integration</TabsTrigger>
              <TabsTrigger value="company-pricing">Company Pricing</TabsTrigger>
              <TabsTrigger value="mailgun">Mailgun Settings</TabsTrigger>
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
            
            <TabsContent value="upload">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-6">Upload Applications</h2>
                <CsvUploader onSuccess={handleUploadSuccess} />
              </div>
            </TabsContent>
            
            <TabsContent value="settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PricingSettings />
                <AdminPasswordChange />
              </div>
            </TabsContent>

            <TabsContent value="stripe">
              <StripeSettings />
            </TabsContent>

            <TabsContent value="company-pricing">
              <CompanyPricingSettings />
            </TabsContent>

            <TabsContent value="mailgun">
              <MailgunSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
