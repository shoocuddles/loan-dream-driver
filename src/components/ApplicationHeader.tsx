
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ApplicationStepIndicator from './ApplicationStepIndicator';

interface ApplicationHeaderProps {
  error: string | null;
  draftId: string | null;
  isSavingProgress: boolean;
  currentStep: number;
}

const ApplicationHeader: React.FC<ApplicationHeaderProps> = ({ 
  error,
  draftId,
  isSavingProgress,
  currentStep
}) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-center text-ontario-blue">Apply for Auto Financing</h1>
      <p className="text-center text-gray-600 mt-2">Complete the form below to get started</p>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Submission Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap break-words">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {draftId && (
        <div className="mt-4 px-4 py-2 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            Your progress is being saved automatically. You can return to complete your application later.
          </p>
        </div>
      )}
      
      {isSavingProgress && (
        <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            Saving your progress...
          </p>
        </div>
      )}
      
      <ApplicationStepIndicator currentStep={currentStep} />
    </div>
  );
};

export default ApplicationHeader;
