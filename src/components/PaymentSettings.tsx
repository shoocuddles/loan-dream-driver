
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";
import { getStripeAccountInfo } from "@/lib/services/stripe/stripeService";
import StripeDebug from './StripeDebug';

const PaymentSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkStripeAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getStripeAccountInfo();
      
      if (response.error) {
        setError(response.error.message);
        toast({
          variant: "destructive",
          title: "Error checking Stripe account",
          description: response.error.message,
        });
      } else if (response.data) {
        setStripeAccount(response.data);
        toast({
          title: "Stripe account retrieved",
          description: "Successfully connected to your Stripe account.",
        });
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Stripe Account</h3>
            <p className="text-sm text-gray-600">
              View your connected Stripe account details.
            </p>
            
            <Button 
              onClick={checkStripeAccount} 
              disabled={isLoading}
              className="mt-2"
            >
              {isLoading ? 'Checking...' : 'Check Stripe Account'}
            </Button>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {stripeAccount && (
              <div className="mt-4 p-4 border rounded-md space-y-3">
                <div>
                  <p className="text-sm font-medium">Account Email</p>
                  <p className="text-sm">{stripeAccount.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Account ID</p>
                  <p className="text-sm font-mono">{stripeAccount.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Country</p>
                  <p className="text-sm">{stripeAccount.country}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${stripeAccount.charges_enabled ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {stripeAccount.charges_enabled ? 'Charges Enabled' : 'Charges Disabled'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${stripeAccount.payouts_enabled ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {stripeAccount.payouts_enabled ? 'Payouts Enabled' : 'Payouts Disabled'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${stripeAccount.details_submitted ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {stripeAccount.details_submitted ? 'Details Complete' : 'Details Incomplete'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Include the StripeDebug component for diagnosing issues */}
      <StripeDebug />
    </div>
  );
};

export default PaymentSettings;
