import { useState, useRef } from "react";
import { ApplicationForm } from "@/lib/types";
import { submitApplication } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useApplicationDraft } from "./useApplicationDraft";

const initialFormState: ApplicationForm = {
  // Step 1: Personal Info
  fullName: "",
  phoneNumber: "",
  email: "",
  streetAddress: "",
  city: "",
  province: "Ontario",
  postalCode: "",
  
  // Step 2: Desired Vehicle
  vehicleType: "",
  requiredFeatures: "",
  unwantedColors: "",
  preferredMakeModel: "",
  
  // Step 3: Existing Car Loan
  hasExistingLoan: false,
  currentPayment: "",
  amountOwed: "",
  currentVehicle: "",
  mileage: "",
  
  // Step 4: Income Details
  employmentStatus: "",
  monthlyIncome: "",
  additionalNotes: ""
};

export const useApplicationForm = (onSuccessfulSubmit: () => void) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const finalSubmissionInProgress = useRef(false);
  const applicationSubmitted = useRef(false);
  
  const { draftId, isSavingProgress, saveDraft, clearDraft } = useApplicationDraft(initialFormState);

  const nextStep = () => {
    localStorage.setItem('applicationDraft', JSON.stringify(formData));
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
    
    if (applicationSubmitted.current) {
      console.log("⚠️ Skipping nextStep auto-save: Application already submitted");
      return;
    }
    
    console.log("nextStep called, saving progress and advancing to step", currentStep + 1);
    
    if (!finalSubmissionInProgress.current) {
      saveDraft(formData)
        .catch(err => {
          console.error("❌ Background save failed:", err);
        });
    } else {
      console.log("Draft save skipped because final submission is in progress");
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const updateFormData = (data: Partial<ApplicationForm>) => {
    if (applicationSubmitted.current) {
      console.log("⚠️ Skipping form update: Application already submitted");
      return;
    }
    
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    try {
      console.log("Final submit called, marking application as complete");
      console.log("Form data being submitted:", formData);
      
      setIsSubmitting(true);
      setError(null);
      
      finalSubmissionInProgress.current = true;
      
      localStorage.setItem('applicationDraft', JSON.stringify(formData));
      console.log("Saved to localStorage");
      
      try {
        console.log("Submitting to server with complete flag");
        
        const applicationToSubmit = draftId ? { ...formData, applicationId: draftId } : formData;
        console.log("Final application data:", applicationToSubmit);
        
        const result = await submitApplication(applicationToSubmit, false);
        
        if (result) {
          console.log("✅ Application submitted successfully:", result);
          applicationSubmitted.current = true;
          
          clearDraft();
          
          toast({
            title: "Application Submitted!",
            description: "Thank you for applying with Ontario Loans. We'll be in touch soon.",
            variant: "default",
          });
          
          setTimeout(() => {
            console.log("Navigating away after successful submission");
            onSuccessfulSubmit();
          }, 2000);
        } else {
          console.error("❌ Failed to submit application - submitApplication returned falsy value");
          throw new Error("Failed to submit application to server");
        }
      } catch (submitError: any) {
        console.error("❌ Error during final submission:", submitError);
        
        if (submitError.stack) {
          console.error("❌ Stack trace:", submitError.stack);
        }
        
        const errorMessage = submitError?.message || 'Unknown error';
        setError(`Submission error details: ${errorMessage}`);
        
        toast({
          title: "Submission Error",
          description: "There was a problem submitting your application. See details below.",
          variant: "destructive",
        });
        
        setIsSubmitting(false);
        finalSubmissionInProgress.current = false;
      }
    } catch (error: any) {
      console.error("❌ Unhandled error in handleSubmit:", error);
      
      const errorMessage = error?.message || 'Unknown error';
      setError(`Error details: ${errorMessage}`);
      
      toast({
        title: "Submission Error",
        description: "There was a problem submitting your application. See details below.",
        variant: "destructive",
      });
      
      setIsSubmitting(false);
      finalSubmissionInProgress.current = false;
    }
  };

  return {
    currentStep,
    formData,
    isSubmitting,
    isSavingProgress,
    draftId,
    error,
    updateFormData,
    nextStep,
    prevStep,
    handleSubmit
  };
};
