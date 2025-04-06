
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

interface ApplicationHeaderProps {
  error: string | null;
  draftId: string | null;
  isSavingProgress: boolean;
  currentStep: number;
  isConfirmation?: boolean;
}

const ApplicationHeader = ({ 
  error, 
  draftId, 
  isSavingProgress,
  currentStep,
  isConfirmation = false
}: ApplicationHeaderProps) => {
  // Map steps to titles
  const stepTitle = () => {
    if (isConfirmation) return "Application Confirmation";
    
    switch (currentStep) {
      case 1: return "Step 1: Personal Information";
      case 2: return "Step 2: Vehicle Details";
      case 3: return "Step 3: Existing Car Loan";
      case 4: return "Step 4: Income Details";
      default: return "Ontario Loans Application";
    }
  };
  
  return (
    <>
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl font-bold text-ontario-blue">{stepTitle()}</h1>
        
        {!isConfirmation && (
          <div className="mt-1 text-sm text-gray-500">
            {isSavingProgress && (
              <span className="flex items-center">
                <LoaderCircle className="h-3 w-3 mr-1 animate-spin" />
                Saving your progress...
              </span>
            )}
            
            {!isSavingProgress && draftId && (
              <span className="flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                Draft saved
              </span>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {!isConfirmation && (
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map(step => (
              <div 
                key={step} 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${currentStep === step 
                    ? 'bg-ontario-blue text-white' 
                    : currentStep > step 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-600'}`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ApplicationHeader;
