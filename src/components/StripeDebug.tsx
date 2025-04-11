
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const StripeDebug = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<Record<string, any>>({});

  const checkFunction = async (functionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true }
      });
      
      return {
        available: true,
        error: error ? error.message : null,
        data: data || null
      };
    } catch (error: any) {
      return {
        available: false,
        error: error.message || "Unknown error",
        data: null
      };
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    const results: Record<string, any> = {};
    
    toast.info("Running Stripe function diagnostics...");
    
    try {
      // Check all relevant functions
      const functions = [
        'create-checkout-session',
        'list-coupons',
        'get-account-info',
        'stripe-webhook'
      ];
      
      for (const fn of functions) {
        results[fn] = await checkFunction(fn);
      }
      
      // Also check Stripe secret key availability
      const { data: accountInfo, error: accountError } = await supabase.functions.invoke('get-account-info', {
        body: { checkSecret: true }
      });
      
      results['stripe_key'] = {
        available: !accountError,
        error: accountError ? accountError.message : null,
        data: accountInfo ? 'Available' : 'Not available'
      };
      
      setStatus(results);
      
      // Determine overall status
      const hasErrors = Object.values(results).some(r => !r.available);
      
      if (hasErrors) {
        toast.error("Some Stripe functions are not available", {
          description: "Check the diagnostics panel for details"
        });
      } else {
        toast.success("All Stripe functions are available");
      }
    } catch (error: any) {
      console.error("Error running diagnostics:", error);
      toast.error("Error running diagnostics", {
        description: error.message || "Unknown error"
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Stripe Integration Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={runDiagnostics} 
            disabled={isChecking} 
            className="w-full"
          >
            {isChecking ? 'Checking...' : 'Check Stripe Functions'}
          </Button>
          
          {Object.keys(status).length > 0 && (
            <div className="border rounded-md p-4 mt-4">
              <h3 className="font-medium mb-2">Diagnostics Results</h3>
              <div className="space-y-2">
                {Object.entries(status).map(([name, result]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between border-b pb-1">
                    <div>
                      <span className="font-mono text-sm">{name}</span>
                      {result.error && (
                        <p className="text-xs text-red-500 mt-1">{result.error}</p>
                      )}
                    </div>
                    <div>
                      {result.available ? (
                        <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">Available</span>
                      ) : (
                        <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">Not Available</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>If any functions show as "Not Available", there may be deployment issues with the edge functions.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeDebug;
