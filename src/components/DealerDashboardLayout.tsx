
import React, { ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import DealerHeader from './DealerHeader';

interface DealerDashboardLayoutProps {
  children?: ReactNode;
  availableApplications: ReactNode;
  downloadedApplications: ReactNode;
  profile: ReactNode;
  payment: ReactNode;
}

const DealerDashboardLayout: React.FC<DealerDashboardLayoutProps> = ({
  children,
  availableApplications,
  downloadedApplications,
  profile,
  payment
}) => {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-ontario-blue" />
        <p className="ml-2 text-lg font-medium">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Please log in</h2>
              <p>You need to log in to access the dealer dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DealerHeader />
      
      <Tabs defaultValue="available" className="mt-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-6">
          <TabsTrigger value="available">Available Leads</TabsTrigger>
          <TabsTrigger value="purchased">Purchased Leads</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-4">
          {availableApplications}
        </TabsContent>
        
        <TabsContent value="purchased" className="space-y-4">
          {downloadedApplications}
        </TabsContent>
        
        <TabsContent value="profile" className="space-y-4 max-w-2xl mx-auto">
          {profile}
        </TabsContent>
        
        <TabsContent value="payment" className="space-y-4 max-w-2xl mx-auto">
          {payment}
        </TabsContent>
      </Tabs>
      
      {children}
    </div>
  );
};

export default DealerDashboardLayout;
