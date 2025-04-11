
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, ExternalLink, Info } from "lucide-react";
import { getStripeAccountInfo } from "@/lib/services/stripe/stripeService";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import StripeDebug from './StripeDebug';

const PaymentSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check for the dealer's Stripe account on component mount
    if (user) {
      checkDealerStripeAccount();
    }
  }, [user]);

  const checkDealerStripeAccount = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if this dealer already has a Stripe account connected
      const { data: dealerData, error: dealerError } = await supabase
        .from('user_profiles')
        .select('stripe_account_id')
        .eq('id', user?.id)
        .single();
      
      if (dealerError) {
        throw new Error('Failed to retrieve dealer profile');
      }
      
      if (dealerData?.stripe_account_id) {
        // Dealer has a Stripe account connected, fetch details
        const response = await getStripeAccountInfo(dealerData.stripe_account_id);
        
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
      } else {
        // Dealer does not have a Stripe account connected yet
        // Create a link for them to connect
        const { data, error: createAccountError } = await supabase.functions.invoke('create-connect-account', {
          body: { dealerId: user?.id }
        });
        
        if (createAccountError) {
          setError(`Failed to create Stripe connect link: ${createAccountError.message}`);
          toast({
            variant: "destructive",
            title: "Stripe Connection Error",
            description: "Unable to generate account connection link.",
          });
        } else if (data?.url) {
          setConnectUrl(data.url);
        }
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

  const disconnectStripeAccount = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Call the disconnect endpoint
      const { error: disconnectError } = await supabase.functions.invoke('disconnect-stripe-account', {
        body: { dealerId: user.id }
      });
      
      if (disconnectError) {
        throw new Error(`Failed to disconnect: ${disconnectError.message}`);
      }
      
      // Clear local state
      setStripeAccount(null);
      toast({
        title: "Stripe account disconnected",
        description: "Your Stripe account has been disconnected successfully.",
      });
      
      // Refresh connection URL
      const { data, error: createAccountError } = await supabase.functions.invoke('create-connect-account', {
        body: { dealerId: user?.id }
      });
      
      if (createAccountError) {
        setError(`Failed to create Stripe connect link: ${createAccountError.message}`);
      } else if (data?.url) {
        setConnectUrl(data.url);
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
            <h3 className="font-medium">Your Stripe Account</h3>
            <p className="text-sm text-gray-600">
              Connect your Stripe account to manage payments for application purchases.
            </p>
            
            {!stripeAccount && !connectUrl && (
              <Button 
                onClick={checkDealerStripeAccount} 
                disabled={isLoading}
                className="mt-2"
              >
                {isLoading ? 'Checking...' : 'Check Stripe Account'}
              </Button>
            )}
            
            {!stripeAccount && connectUrl && (
              <div className="mt-4">
                <Alert className="bg-blue-50 text-blue-800 border-blue-200 mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You need to connect a Stripe account to purchase applications. Your payment information will be securely stored with Stripe.
                  </AlertDescription>
                </Alert>
                <Button 
                  className="bg-[#6772e5] hover:bg-[#5469d4] text-white"
                  onClick={() => window.location.href = connectUrl}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.333 13.333h5.334V16h-5.334v-2.667zm-8 0h5.334V16H5.333v-2.667z" fill="#fff"/>
                    <path d="M26.667 26.667H5.333V5.333h21.334v21.334z" fill="none" stroke="#fff" strokeWidth="2.667"/>
                  </svg>
                  Connect with Stripe
                </Button>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {stripeAccount && (
              <div className="mt-4 space-y-4">
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Your Stripe account is connected and ready to make purchases.
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 border rounded-md space-y-3">
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
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center text-xs"
                      onClick={() => window.open("https://dashboard.stripe.com/", "_blank")}
                    >
                      Open Stripe Dashboard <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                      onClick={disconnectStripeAccount}
                      disabled={isLoading}
                    >
                      Disconnect Stripe Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>
              Note: Your payment information is securely stored with Stripe. We do not store your credit card details.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Only show debug tools for admin users */}
      {process.env.NODE_ENV === 'development' && (
        <StripeDebug />
      )}
    </div>
  );
};

export default PaymentSettings;
