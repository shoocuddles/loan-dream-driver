
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save, CheckCircle } from "lucide-react";

interface ApplicationHeaderProps {
  error: string | null;
  draftId: string | null;
  isSavingProgress: boolean;
  currentStep: number;
}

const ApplicationHeader = ({ error, draftId, isSavingProgress, currentStep }: ApplicationHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-center text-ontario-blue">
          Auto Loan Application
        </h1>
        
        <p className="text-gray-500 text-center mb-4">
          Complete this form to apply for auto financing.
        </p>
        
        {/* Step numbers */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step}
                className={`rounded-full w-8 h-8 flex items-center justify-center border ${
                  currentStep === step
                    ? "bg-ontario-blue text-white border-ontario-blue"
                    : currentStep > step
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-gray-100 text-gray-500 border-gray-300"
                }`}
              >
                {currentStep > step ? (
                  <CheckCircle className="w-5 h-5 text-green-700" />
                ) : (
                  <span>{step}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Draft status */}
        {draftId && (
          <div className="text-sm text-center text-gray-500 flex items-center justify-center gap-1 mb-2">
            {isSavingProgress ? (
              <>
                <Save className="h-3 w-3 animate-pulse" />
                <span>Saving progress...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Progress saved automatically</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationHeader;
