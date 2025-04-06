import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import { getSupabaseConnectionInfo, testSupabaseConnection } from "@/integrations/supabase/client";

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
  const [connectionStatus, setConnectionStatus] = useState<{connected: boolean, latency?: number}>({connected: false});
  const submissionAttempted = useRef(false);
  const submissionSuccessful = useRef(false);
  const connectionInfo = getSupabaseConnectionInfo();

  // Test Supabase connection when debug panel is opened
  useEffect(() => {
    if (showDebugInfo) {
      testSupabaseConnection()
        .then(status => setConnectionStatus(status))
        .catch(() => setConnectionStatus({connected: false}));
    }
  }, [showDebugInfo]);

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
      
      // Log connection status before submission for debugging
      if (import.meta.env.DEV) {
        testSupabaseConnection().then(status => {
          console.log("Supabase connection status before submission:", status);
          // Proceed with submission
          onSubmit();
        });
      } else {
        onSubmit();
      }
    } else {
      console.log("Form validation failed");
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
      
      {/* Submission Details Toggle */}
      <div className="flex justify-center">
        <button 
          type="button"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {showDebugInfo ? "Hide Submission Details" : "Show Submission Details"}
        </button>
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
              <p><span className="font-semibold">Request Body Sample:</span></p>
              <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-32">
                {JSON.stringify({
                  fullname: formData.fullName,
                  email: formData.email, 
                  status: "submitted",
                  iscomplete: true
                }, null, 2)}
              </pre>
              <p className="mt-2 text-xs text-gray-500">Check browser console for complete data details</p>
            </div>
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
            Sending to {connectionInfo.url}...
          </p>
        </div>
      )}
    </form>
  );
};

export default ApplicationFormStep4;
