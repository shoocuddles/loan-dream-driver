
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, Info, Wifi, WifiOff } from "lucide-react";
import { getSupabaseConnectionInfo, testSupabaseConnection } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { testDirectConnection } from "@/lib/directApiClient";

interface ApplicationFormStep4Props {
  formData: ApplicationForm;
  updateFormData: (data: Partial<ApplicationForm>) => void;
  prevStep: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ApplicationFormStep4 = ({ 
  formData, 
  updateFormData, 
  prevStep, 
  onSubmit,
  isSubmitting 
}: ApplicationFormStep4Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean, 
    latency?: number, 
    directApiConnected?: boolean
  }>({connected: false});
  const [networkConnectivity, setNetworkConnectivity] = useState<boolean | null>(null);
  const submissionAttempted = useRef(false);
  const submissionSuccessful = useRef(false);
  const connectionInfo = getSupabaseConnectionInfo();

  // Test both connection methods when debug panel is opened
  useEffect(() => {
    if (showDebugInfo) {
      checkConnectivity();
    }
  }, [showDebugInfo]);

  // Check network connectivity
  const checkConnectivity = async () => {
    try {
      // Check basic internet connectivity
      const networkConnected = await fetch('https://www.google.com/favicon.ico', { 
        mode: 'no-cors',
        cache: 'no-cache',
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      })
      .then(() => true)
      .catch(() => false);
      
      setNetworkConnectivity(networkConnected);
      
      // If no network, don't bother checking Supabase
      if (!networkConnected) {
        setConnectionStatus({connected: false});
        toast.error("No internet connection detected");
        return;
      }
      
      // Test Supabase connection
      const supabaseStatus = await testSupabaseConnection();
      
      // Also test direct API connection as backup
      const directApiConnected = await testDirectConnection();
      
      setConnectionStatus({
        ...supabaseStatus,
        directApiConnected
      });
      
      if (!supabaseStatus.connected && !directApiConnected) {
        toast.error("Database connection unavailable. Please try again later.");
      } else if (!supabaseStatus.connected && directApiConnected) {
        toast.info("Using backup connection method");
      }
    } catch (error) {
      console.error("Failed to check connectivity:", error);
      setConnectionStatus({connected: false});
      toast.error("Failed to check database connection.");
    }
  };

  const validateForm = () => {
    console.log("Validating form in Step 4");
    const newErrors: Record<string, string> = {};
    
    if (!formData.employmentStatus) newErrors.employmentStatus = "Employment status is required";
    if (!formData.monthlyIncome) newErrors.monthlyIncome = "Monthly income is required";
    if (!acceptTerms) newErrors.acceptTerms = "You must accept the terms and conditions";
    
    console.log("Form validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Step 4 submit button clicked");
    
    submissionAttempted.current = true;
    
    if (validateForm()) {
      console.log("Form validation passed, calling onSubmit()");
      
      // Simplified: Just submit and let the applicationService handle connectivity issues
      onSubmit();
      
      // After submission starts, check connectivity to show proper UI
      checkConnectivity();
    } else {
      console.log("Form validation failed");
      toast.error("Please fix the errors before submitting.");
    }
  };

  // Determine the button state
  const getSubmitButton = () => {
    if (submissionSuccessful.current) {
      return (
        <Button 
          type="button" 
          className="bg-green-500 hover:bg-green-500 cursor-not-allowed"
          disabled={true}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Application Submitted
        </Button>
      );
    }

    if (isSubmitting) {
      return (
        <Button 
          type="submit" 
          className="bg-ontario-blue hover:bg-ontario-blue/90"
          disabled={true}
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </Button>
      );
    }

    // If submission attempted and failed
    if (submissionAttempted.current && Object.keys(errors).length > 0) {
      return (
        <Button 
          type="submit" 
          className="bg-ontario-blue hover:bg-ontario-blue/90"
        >
          Try Again
        </Button>
      );
    }

    // Default state
    return (
      <Button 
        type="submit" 
        className="bg-ontario-blue hover:bg-ontario-blue/90"
        disabled={isSubmitting}
      >
        Submit Application
      </Button>
    );
  };

  // Update success state when submission completes
  useEffect(() => {
    if (!isSubmitting && submissionAttempted.current && Object.keys(errors).length === 0) {
      submissionSuccessful.current = true;
    }
  }, [isSubmitting, errors]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-ontario-blue mb-6">Income Details</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="employmentStatus">Employment Status</Label>
          <Select 
            value={formData.employmentStatus} 
            onValueChange={(value) => {
              // Ensure value matches the ApplicationForm type
              const typedValue = value as "" | "Employed" | "Unemployed" | "Self-Employed" | "Student" | "Retired" | "Disability";
              updateFormData({ employmentStatus: typedValue });
            }}
          >
            <SelectTrigger className={errors.employmentStatus ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your employment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employed">Employed</SelectItem>
              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
              <SelectItem value="Unemployed">Unemployed</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="Disability">On Disability</SelectItem>
            </SelectContent>
          </Select>
          {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>}
        </div>
        
        <div>
          <Label htmlFor="monthlyIncome">Monthly Income ($)</Label>
          <Input
            id="monthlyIncome"
            value={formData.monthlyIncome}
            onChange={(e) => updateFormData({ monthlyIncome: e.target.value })}
            className={errors.monthlyIncome ? "border-red-500" : ""}
          />
          {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
        </div>
        
        <div>
          <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
          <Textarea
            id="additionalNotes"
            value={formData.additionalNotes}
            onChange={(e) => updateFormData({ additionalNotes: e.target.value })}
            placeholder="Any additional information that might help with your application"
          />
        </div>
        
        <div className="pt-4">
          <div className="flex items-start space-x-2 mb-4">
            <Checkbox 
              id="acceptTerms" 
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              className={errors.acceptTerms ? "border-red-500" : ""}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="acceptTerms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm that all details are accurate and I authorize Ontario Loans to conduct a soft credit check.
              </label>
            </div>
          </div>
          {errors.acceptTerms && <p className="text-red-500 text-sm mb-4">{errors.acceptTerms}</p>}
          
          <p className="text-sm text-gray-500 mb-6">
            By submitting this application, you agree to our{" "}
            <Link to="/terms" className="text-ontario-blue underline hover:text-ontario-lightblue" target="_blank">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-ontario-blue underline hover:text-ontario-lightblue" target="_blank">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
      
      {/* Network Status Indicator */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {networkConnectivity === true ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : networkConnectivity === false ? (
            <WifiOff className="h-4 w-4 text-red-500" />
          ) : (
            <div className="w-4 h-4"></div>
          )}
          <span>
            {networkConnectivity === true 
              ? "Connected to network" 
              : networkConnectivity === false 
                ? "Network connection issues" 
                : ""}
          </span>
          {connectionStatus.directApiConnected && !connectionStatus.connected && (
            <span className="ml-2 text-amber-600">(Using backup connection)</span>
          )}
          <button 
            type="button"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="ml-4 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {showDebugInfo ? "Hide Details" : "Show Details"}
          </button>
        </div>
      </div>
      
      {/* Extended Submission Details Panel */}
      {showDebugInfo && (
        <Alert className="bg-gray-50 border-gray-200">
          <AlertDescription>
            <div className="text-xs font-mono space-y-2">
              <p><span className="font-semibold">Endpoint:</span> {connectionInfo.tables.applications}</p>
              <p><span className="font-semibold">Method:</span> POST</p>
              <p><span className="font-semibold">Content-Type:</span> application/json</p>
              <p><span className="font-semibold">Fields sent:</span> {Object.keys(formData).filter(k => 
                formData[k as keyof ApplicationForm] !== '' && 
                formData[k as keyof ApplicationForm] !== undefined
              ).length} fields</p>
              <p><span className="font-semibold">Connection Status:</span> 
                <span className={connectionStatus.connected ? "text-green-500" : "text-red-500"}>
                  {connectionStatus.connected ? ` Connected (${connectionStatus.latency}ms)` : " Not connected"}
                </span>
              </p>
              <p><span className="font-semibold">Backup API:</span> 
                <span className={connectionStatus.directApiConnected ? "text-green-500" : "text-red-500"}>
                  {connectionStatus.directApiConnected ? " Available" : " Not available"}
                </span>
              </p>
              {!connectionStatus.connected && connectionStatus.directApiConnected && (
                <p className="text-amber-600 font-semibold">Using backup connection method</p>
              )}
              <p><span className="font-semibold">Request Body Sample:</span></p>
              <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-32">
                {JSON.stringify({
                  fullname: formData.fullName,
                  email: formData.email, 
                  status: "submitted",
                  iscomplete: true
                }, null, 2)}
              </pre>
              <div className="mt-4 flex justify-center">
                <Button 
                  type="button" 
                  variant="outline"
                  size="sm"
                  onClick={checkConnectivity}
                  className="text-xs"
                >
                  Test Connection
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">Check browser console for complete data details</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* If network connectivity is an issue, show alert */}
      {networkConnectivity === false && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Network Connection Issue</AlertTitle>
          <AlertDescription>
            It appears you're offline or having connection issues. Your application will be saved locally
            and submitted automatically when your connection is restored.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="pt-4 flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={prevStep}
          disabled={isSubmitting || submissionSuccessful.current}
        >
          Back
        </Button>
        
        {getSubmitButton()}
      </div>
      
      {/* Visual indication of submission in progress */}
      {isSubmitting && submissionAttempted.current && (
        <div className="mt-4">
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-ontario-blue animate-pulse rounded-full"></div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {connectionStatus.directApiConnected && !connectionStatus.connected
              ? "Sending via backup connection..."
              : `Sending to ${connectionInfo.url}...`}
          </p>
          <p className="text-center text-xs text-gray-400 mt-1">
            Your application will be saved even if your connection is interrupted
          </p>
        </div>
      )}
    </form>
  );
};

export default ApplicationFormStep4;
