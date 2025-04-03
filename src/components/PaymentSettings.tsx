
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

const PaymentSettings = () => {
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalDownloads, setTotalDownloads] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadPaymentStats = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, we would query Supabase for download history
        // For demo purposes, let's use mock data
        const downloadsMock = [
          { paymentAmount: 10.99 },
          { paymentAmount: 10.99 },
          { paymentAmount: 5.99 }
        ];
        
        const total = downloadsMock.reduce((sum, download) => sum + download.paymentAmount, 0);
        
        setTotalSpent(total);
        setTotalDownloads(downloadsMock.length);
      } catch (error) {
        console.error("Error loading payment stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPaymentStats();
  }, []);
  
  const handleUpdatePaymentMethod = () => {
    // In a real implementation, this would redirect to Stripe Customer Portal
    window.open("https://stripe.com", "_blank");
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>Manage your payment methods and view your purchase history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-2xl font-bold text-ontario-blue">
              ${isLoading ? '...' : totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-500">Downloads</p>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? '...' : totalDownloads}
            </p>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="font-medium mb-2">Payment Method</h3>
          <Button 
            onClick={handleUpdatePaymentMethod}
            className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
          >
            Update Payment Method
          </Button>
          <p className="mt-2 text-xs text-gray-500">
            Your payment information is securely stored with Stripe.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSettings;
