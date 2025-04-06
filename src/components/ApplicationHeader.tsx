
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { getSupabaseConnectionInfo, testSupabaseConnection } from "@/integrations/supabase/client";

interface ApplicationHeaderProps {
  error: string | null;
  draftId: string | null;
  isSavingProgress: boolean;
  currentStep: number;
}

const ApplicationHeader = ({ 
  error, 
  draftId, 
  isSavingProgress,
  currentStep 
}: ApplicationHeaderProps) => {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latency?: number;
    error?: string;
  } | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const connectionInfo = getSupabaseConnectionInfo();

  // Check connection on mount
  useEffect(() => {
    async function checkConnection() {
      const status = await testSupabaseConnection();
      setConnectionStatus(status);
    }
    
    checkConnection();
  }, []);

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-2 text-center text-ontario-darkblue">
        Auto Financing Application
      </h1>
      
      <p className="text-lg text-center mb-6">
        Fill out the form below to apply for auto financing
      </p>
      
      {/* Display the step indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step}
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                step === currentStep 
                  ? 'bg-ontario-blue text-white font-bold' 
                  : step < currentStep 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step < currentStep ? <CheckCircle2 size={16} /> : step}
            </div>
          ))}
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isSavingProgress && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Saving your progress</AlertTitle>
          <AlertDescription>Please wait while your application is being saved.</AlertDescription>
        </Alert>
      )}
      
      {draftId && !error && !isSavingProgress && (
        <Alert className="mb-6 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Draft Saved</AlertTitle>
          <AlertDescription>
            Your application is automatically saved as you progress. Draft ID: {draftId.substring(0, 8)}...
          </AlertDescription>
        </Alert>
      )}
      
      {/* Debug information button */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {showDebugInfo ? "Hide Debug Info" : "Show Connection Debug Info"}
        </button>
      </div>
      
      {/* Debug information panel */}
      {showDebugInfo && (
        <div className="bg-gray-100 p-3 rounded text-sm mb-6 font-mono text-xs">
          <h4 className="font-bold mb-1">Supabase Connection:</h4>
          <p>URL: {connectionInfo.url}</p>
          <p>Applications Table: {connectionInfo.tables.applications}</p>
          <p>Connection Status: {
            connectionStatus === null ? "Checking..." : 
            connectionStatus.connected ? `Connected (${connectionStatus.latency}ms)` : 
            `Failed (${connectionStatus.error})`
          }</p>
          
          <div className="mt-3">
            <h4 className="font-bold mb-1">Application Data Path:</h4>
            <ul className="list-disc pl-5">
              <li>Form Data → applicationService.ts → submitApplicationToSupabase</li>
              <li>Supabase Client → applications table</li>
              <li>Endpoint: {connectionInfo.tables.applications}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationHeader;
