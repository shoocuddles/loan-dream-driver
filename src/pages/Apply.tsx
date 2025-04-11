import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApplicationFormStep1 from "@/components/ApplicationFormStep1";
import ApplicationFormStep2 from "@/components/ApplicationFormStep2";
import ApplicationFormStep3 from "@/components/ApplicationFormStep3";
import ApplicationFormStep4 from "@/components/ApplicationFormStep4";
import ApplicationConfirmation from "@/components/ApplicationConfirmation";
import ApplicationHeader from "@/components/ApplicationHeader";
import { useApplicationForm } from "@/hooks/useApplicationForm";
import { checkSupabaseConnection, detectFirebaseDependencies } from "@/lib/supabaseUtils";
import { toast } from "sonner";
import { checkForOfflineSubmission, recoverOfflineSubmission } from "@/lib/applicationService";

const Apply = () => {
  const navigate = useNavigate();
  
  const {
    currentStep,
    formData,
    isSubmitting,
    isSavingProgress,
    draftId,
    error,
    submissionComplete,
    submittedData,
    updateFormData,
    updateSubmittedApplication,
    nextStep,
    prevStep,
    handleSubmit
  } = useApplicationForm(() => navigate("/"));

  // Run diagnostic checks on component mount
  useEffect(() => {
    // Check Supabase connection on mount
    checkSupabaseConnection().catch(err => {
      console.error("Failed to check Supabase connection:", err);
    });
    
    // Check for Firebase dependencies
    detectFirebaseDependencies();
    
    // Check for offline submissions that need recovery
    if (checkForOfflineSubmission()) {
      toast.info(
        "We found an application saved offline. Attempting to submit it now.",
        {
          duration: 8000,
          action: {
            label: "Dismiss",
            onClick: () => {}
          }
        }
      );
      
      // Try to recover offline submission
      recoverOfflineSubmission().catch(err => {
        console.error("Failed to recover offline submission:", err);
      });
    }
  }, [submissionComplete]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ApplicationFormStep1
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
          />
        );
      case 2:
        return (
          <ApplicationFormStep2
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <ApplicationFormStep3
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
        return (
          <ApplicationFormStep4
            formData={formData}
            updateFormData={updateFormData}
            prevStep={prevStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      case 5:
        return (
          <ApplicationConfirmation
            formData={formData}
            submittedData={submittedData}
            updateData={updateSubmittedApplication}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <ApplicationHeader
              error={error}
              draftId={draftId}
              isSavingProgress={isSavingProgress}
              currentStep={currentStep}
              isConfirmation={currentStep === 5}
            />
            
            {renderStep()}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Apply;
