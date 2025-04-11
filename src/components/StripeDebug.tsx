
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

const StripeDebug = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<Record<string, any>>({});
  const [edgeFunctions, setEdgeFunctions] = useState<string[]>([]);
  const [detailedLogs, setDetailedLogs] = useState<string>("");
  const [authStatus, setAuthStatus] = useState<{isAuthenticated: boolean, token?: string}>({
    isAuthenticated: false
  });

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setAuthStatus({
        isAuthenticated: !!data?.session?.access_token,
        token: data?.session?.access_token
      });
      
      setDetailedLogs(logs => logs + `Authentication check: ${!!data?.session ? 'Authenticated' : 'Not authenticated'}\n`);
      
      if (!data?.session) {
        setDetailedLogs(logs => logs + "⚠️ WARNING: You are not authenticated. Edge function calls will fail without authentication.\n");
      }
    } catch (error: any) {
      setDetailedLogs(logs => logs + `Error checking auth status: ${error.message}\n`);
      setAuthStatus({ isAuthenticated: false });
    }
  };

  const checkFunction = async (functionName: string) => {
    try {
      // Use a simple test body that won't cause issues
      const testBody = { test: true };
      
      setDetailedLogs(logs => logs + `Testing function ${functionName} with test body: ${JSON.stringify(testBody)}\n`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: testBody
      });
      
      setDetailedLogs(logs => logs + `Response from ${functionName}: ${error ? `ERROR: ${error.message}` : 'Success - ' + JSON.stringify(data)}\n`);
      
      return {
        available: !error,
        error: error ? error.message : null,
        data: data || null
      };
    } catch (error: any) {
      setDetailedLogs(logs => logs + `Exception testing ${functionName}: ${error.message}\n`);
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
        'create-checkout',
        'create-checkout-session',
        'verify-purchase',
        'list-coupons',
        'get-account-info',
        'stripe-webhook',
        'get-prices',
        'sync-prices',
        'create-coupon',
        'create-connect-account',
        'disconnect-stripe-account'
      ];
      
      setDetailedLogs(logs => logs + `Checking for deployed functions: ${functionsToCheck.join(', ')}\n`);
      const availableFunctions: string[] = [];
      
      for (const fn of functionsToCheck) {
        try {
          // Instead of accessing the protected url property, construct the URL manually
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kgtfpuvksmqyaraijoal.supabase.co";
          const functionUrl = `${supabaseUrl}/functions/v1/${fn}`;
          
          setDetailedLogs(logs => logs + `Checking function URL: ${functionUrl}\n`);
          
          const headers: HeadersInit = {};
          if (authStatus.token) {
            headers['Authorization'] = `Bearer ${authStatus.token}`;
          }
          
          const response = await fetch(functionUrl, { 
            method: 'HEAD',
            headers
          });
          
          setDetailedLogs(logs => logs + `Function ${fn} check status: ${response.status}\n`);
          
          // If we get any response (even an error), the function exists
          if (response) {
            availableFunctions.push(fn);
          }
        } catch (error: any) {
          setDetailedLogs(logs => logs + `Error checking function ${fn}: ${error.message}\n`);
          // Ignore errors, just means the function isn't available
        }
      }
      
      return availableFunctions;
    } catch (error: any) {
      console.error("Error listing functions:", error);
      setDetailedLogs(logs => logs + `Error listing functions: ${error.message}\n`);
      return [];
    }
  };

  const testCheckoutSession = async () => {
    try {
      if (!authStatus.isAuthenticated) {
        setDetailedLogs(logs => logs + "Cannot test checkout: You need to be authenticated first\n");
        toast.error("Authentication required", { description: "You must be logged in to test the checkout function" });
        return;
      }
      
      setIsChecking(true);
      setDetailedLogs("Testing create-checkout-session function...\n");
      
      // Get system settings for price info
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('standard_price')
        .single();
        
      if (settingsError) {
        setDetailedLogs(logs => logs + `Error fetching system settings: ${settingsError.message}\n`);
        return;
      }
      
      // Get available applications
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('id')
        .limit(1);
        
      if (appError || !applications || applications.length === 0) {
        setDetailedLogs(logs => logs + `No applications found for testing. Error: ${appError?.message || "No data"}\n`);
        return;
      }
      
      const testAppId = applications[0].id;
      setDetailedLogs(logs => logs + `Using test application ID: ${testAppId}\n`);
      
      // Call the checkout session function
      setDetailedLogs(logs => logs + `Calling create-checkout-session with applicationIds=[${testAppId}], priceType=standard\n`);
      const response = await supabase.functions.invoke('create-checkout-session', {
        body: {
          applicationIds: [testAppId],
          priceType: 'standard'
        }
      });
      
      if (response.error) {
        setDetailedLogs(logs => logs + `Error response: ${JSON.stringify(response.error, null, 2)}\n`);
        toast.error("Test failed", { description: response.error.message });
      } else {
        setDetailedLogs(logs => logs + `Success response: ${JSON.stringify(response.data, null, 2)}\n`);
        toast.success("Test successful", { description: "Checkout session created successfully" });
      }
    } catch (error: any) {
      setDetailedLogs(logs => logs + `Exception: ${error.message}\n`);
      toast.error("Test failed", { description: error.message });
    } finally {
      setIsChecking(false);
    }
  };
  
  const testVerifyPurchase = async () => {
    try {
      if (!authStatus.isAuthenticated) {
        setDetailedLogs(logs => logs + "Cannot test verify purchase: You need to be authenticated first\n");
        toast.error("Authentication required", { description: "You must be logged in to test the verify purchase function" });
        return;
      }
      
      setIsChecking(true);
      setDetailedLogs(logs => logs + "\nTesting verify-purchase function...\n");
      
      // Create a fake session ID for testing
      const testSessionId = `test_session_${Date.now()}`;
      
      // Call the verify purchase function
      setDetailedLogs(logs => logs + `Calling verify-purchase with sessionId=${testSessionId}\n`);
      const response = await supabase.functions.invoke('verify-purchase', {
        body: {
          sessionId: testSessionId
        }
      });
      
      if (response.error) {
        // We actually expect an error since the session doesn't exist
        // But the important part is that the function responded
        setDetailedLogs(logs => logs + `Error response (expected): ${JSON.stringify(response.error, null, 2)}\n`);
        if (response.error.message.includes("No session ID")) {
          toast.success("Test successful", { description: "Verify purchase function is available" });
        } else {
          toast.error("Test failed", { description: response.error.message });
        }
      } else {
        setDetailedLogs(logs => logs + `Success response: ${JSON.stringify(response.data, null, 2)}\n`);
        toast.success("Test successful", { description: "Verify purchase function is available" });
      }
    } catch (error: any) {
      setDetailedLogs(logs => logs + `Exception: ${error.message}\n`);
      toast.error("Test failed", { description: error.message });
    } finally {
      setIsChecking(false);
    }
  };
  
  const testSimpleFunction = async (functionName: string) => {
    try {
      if (!authStatus.isAuthenticated) {
        setDetailedLogs(logs => logs + `Cannot test ${functionName}: You need to be authenticated first\n`);
        toast.error("Authentication required", { description: "You must be logged in to test this function" });
        return;
      }
      
      setIsChecking(true);
      setDetailedLogs(logs => logs + `\nTesting ${functionName} function...\n`);
      
      // Call the function with a simple test body
      const response = await supabase.functions.invoke(functionName, {
        body: { test: true }
      });
      
      if (response.error) {
        setDetailedLogs(logs => logs + `Error response: ${JSON.stringify(response.error, null, 2)}\n`);
        toast.error("Test failed", { description: response.error.message });
      } else {
        setDetailedLogs(logs => logs + `Success response: ${JSON.stringify(response.data, null, 2)}\n`);
        toast.success("Test successful", { description: `${functionName} function is available` });
      }
    } catch (error: any) {
      setDetailedLogs(logs => logs + `Exception: ${error.message}\n`);
      toast.error("Test failed", { description: error.message });
    } finally {
      setIsChecking(false);
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    setDetailedLogs("");
    const results: Record<string, any> = {};
    
    toast.info("Running Stripe function diagnostics...");
    
    try {
      // First check auth status
      await checkAuthStatus();
      
      // First check which edge functions are available
      setDetailedLogs(logs => logs + "Checking for deployed edge functions...\n");
      const functions = await listEdgeFunctions();
      setEdgeFunctions(functions);
      setDetailedLogs(logs => logs + `Found ${functions.length} deployed functions: ${functions.join(', ')}\n`);
      
      // Then check critical functions
      const criticalFunctions = [
        'create-checkout-session',
        'list-coupons',
        'get-account-info'
      ];
      
      for (const fn of criticalFunctions) {
        setDetailedLogs(logs => logs + `Checking function ${fn}...\n`);
        if (functions.includes(fn)) {
          results[fn] = await checkFunction(fn);
          setDetailedLogs(logs => logs + `Result for ${fn}: ${results[fn].available ? 'Available' : 'Not Available'}\n`);
          if (results[fn].error) {
            setDetailedLogs(logs => logs + `Error: ${results[fn].error}\n`);
          }
        } else {
          results[fn] = { 
            available: false, 
            error: "Function not deployed",
            data: null
          };
          setDetailedLogs(logs => logs + `Function ${fn} is not deployed\n`);
        }
      }
      
      // Also check Stripe secret key availability
      setDetailedLogs(logs => logs + "Checking Stripe API key...\n");
      const { data: accountInfo, error: accountError } = await supabase.functions.invoke('get-account-info', {
        body: { checkSecret: true }
      });
      
      results['stripe_key'] = {
        available: !accountError,
        error: accountError ? accountError.message : null,
        data: accountInfo ? 'Available' : 'Not available'
      };
      
      setDetailedLogs(logs => logs + `Stripe API key: ${!accountError ? 'Available' : 'Not Available'}\n`);
      if (accountError) {
        setDetailedLogs(logs => logs + `Error: ${accountError.message}\n`);
      }
      
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
      setDetailedLogs(logs => logs + `Diagnostic error: ${error.message}\n`);
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
          <Alert variant={authStatus.isAuthenticated ? "default" : "destructive"} className="mb-4">
            <div className="flex items-center gap-2">
              {authStatus.isAuthenticated ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {authStatus.isAuthenticated 
                  ? "Authenticated" 
                  : "Not Authenticated"}
              </AlertTitle>
            </div>
            <AlertDescription>
              {authStatus.isAuthenticated 
                ? "You are authenticated. Edge functions can be tested." 
                : "You need to be logged in to test protected edge functions."}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={runDiagnostics} 
              disabled={isChecking} 
              variant="outline"
              className="flex-1"
            >
              {isChecking ? 'Checking...' : 'Check Stripe Functions'}
            </Button>
            
            <Button 
              onClick={testCheckoutSession}
              disabled={isChecking || !authStatus.isAuthenticated}
              variant="outline"
              className="flex-1"
            >
              Test Checkout Session
            </Button>
            
            <Button 
              onClick={testVerifyPurchase}
              disabled={isChecking || !authStatus.isAuthenticated}
              variant="outline"
              className="flex-1"
            >
              Test Verify Purchase
            </Button>
            
            <Button
              onClick={() => testSimpleFunction('list-coupons')}
              disabled={isChecking || !authStatus.isAuthenticated}
              variant="outline"
              className="flex-1"
            >
              Test List Coupons
            </Button>
            
            <Button
              onClick={checkAuthStatus}
              variant="outline"
              className="flex-1"
              disabled={isChecking}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Auth Status
            </Button>
          </div>
          
          {edgeFunctions.length > 0 && (
            <div className="border rounded-md p-4 mt-4">
              <h3 className="font-medium mb-2">Deployed Edge Functions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {edgeFunctions.map((fn) => (
                  <div key={fn} className="flex items-center gap-2 text-sm">
                    <span className="text-sm font-mono truncate">{fn}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
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
              
              {Object.values(status).some((r: any) => !r.available) && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some functions are not available</AlertTitle>
                  <AlertDescription>
                    There are issues with one or more Stripe functions. Check the detailed logs below for more information.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {detailedLogs && (
            <div className="border rounded-md p-4 mt-4 bg-gray-50">
              <h3 className="font-medium mb-2">Detailed Logs</h3>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-black text-white p-4 rounded overflow-auto max-h-96">
                {detailedLogs}
              </pre>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            <p>If any functions show as "Not Available", there may be deployment issues with the edge functions.</p>
            <p className="mt-1">Common issues:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Authentication errors: You must be logged in to test protected functions</li>
              <li>Incorrect environment variables</li>
              <li>Syntax errors in Edge Function code</li>
              <li>Missing permissions</li>
              <li>Stripe API version mismatch</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeDebug;
