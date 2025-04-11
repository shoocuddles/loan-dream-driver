
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const StripeDebug = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<Record<string, any>>({});
  const [edgeFunctions, setEdgeFunctions] = useState<string[]>([]);

  const checkFunction = async (functionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true }
      });
      
      return {
        available: !error,
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
  
  const listEdgeFunctions = async () => {
    try {
      // This is just a way to check if functions are registered
      // It doesn't actually list all functions but checks specific ones
      const functionsToCheck = [
        'create-checkout-session',
        'verify-purchase',
        'list-coupons',
        'get-account-info',
        'stripe-webhook',
        'get-prices',
        'sync-prices',
        'create-coupon'
      ];
      
      const availableFunctions: string[] = [];
      
      for (const fn of functionsToCheck) {
        try {
          // Use fetch with the Supabase project URL instead of accessing the protected url property
          const supabaseUrl = "https://kgtfpuvksmqyaraijoal.supabase.co";
          const response = await fetch(
            `${supabaseUrl}/functions/v1/${fn}`,
            { method: 'HEAD' }
          );
          
          // If we get any response (even an error), the function exists
          if (response) {
            availableFunctions.push(fn);
          }
        } catch (error) {
          // Ignore errors, just means the function isn't available
        }
      }
      
      return availableFunctions;
    } catch (error) {
      console.error("Error listing functions:", error);
      return [];
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    const results: Record<string, any> = {};
    
    toast.info("Running Stripe function diagnostics...");
    
    try {
      // First check which edge functions are available
      const functions = await listEdgeFunctions();
      setEdgeFunctions(functions);
      
      // Then check critical functions
      const criticalFunctions = [
        'create-checkout-session',
        'list-coupons',
        'get-account-info'
      ];
      
      for (const fn of criticalFunctions) {
        if (functions.includes(fn)) {
          results[fn] = await checkFunction(fn);
        } else {
          results[fn] = { 
            available: false, 
            error: "Function not deployed",
            data: null
          };
        }
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
          
          {edgeFunctions.length > 0 && (
            <div className="border rounded-md p-4 mt-4">
              <h3 className="font-medium mb-2">Deployed Edge Functions</h3>
              <div className="space-y-1">
                {edgeFunctions.map((fn) => (
                  <div key={fn} className="flex items-center gap-2">
                    <span className="text-sm font-mono">{fn}</span>
                    <span className="text-xs text-green-500">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
