
import { useState, useEffect, useRef } from "react";
import { ApplicationForm } from "@/lib/types";
import { submitApplication } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

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
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const finalSubmissionInProgress = useRef(false);
  const applicationSubmitted = useRef(false);

  // Load saved draft data on initial load
  useEffect(() => {
    const savedDraft = localStorage.getItem('applicationDraft');
    const savedDraftId = localStorage.getItem('applicationDraftId');
    
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft));
    }
    
    if (savedDraftId) {
      setDraftId(savedDraftId);
    }
  }, []);

  const saveProgress = async (data: ApplicationForm, isComplete = false) => {
    try {
      if (!isComplete && applicationSubmitted.current) {
        console.log("⚠️ Draft save blocked: Application already submitted successfully");
        return true;
      }

      if (!isComplete && finalSubmissionInProgress.current) {
        console.log("Draft save skipped because final submission is in progress");
        return true;
      }

      setError(null);
      setIsSavingProgress(true);
      
      localStorage.setItem('applicationDraft', JSON.stringify(data));
      
      try {
        const applicationData = {
          ...data,
          isComplete,
          status: isComplete ? 'submitted' : 'draft'
        };
        
        console.log('Preparing to submit application data:', 
          isComplete ? 'FINAL SUBMISSION' : 'Draft save', 
          draftId ? `with ID: ${draftId}` : 'new application');
        
        let result = null;
        if (draftId) {
          console.log('Updating existing draft with ID:', draftId);
          result = await submitApplication({ ...applicationData, id: draftId }, !isComplete);
          console.log('Update application result:', result);
        } else {
          console.log('Creating new application', isComplete ? '(COMPLETE)' : '(draft)');
          result = await submitApplication(applicationData, !isComplete);
          console.log('Create application result:', result);
        }
        
        if (result && result.id && !draftId) {
          console.log('Setting draft ID:', result.id);
          setDraftId(result.id);
          localStorage.setItem('applicationDraftId', result.id);
        }
        
        setIsSavingProgress(false);
        
        if (isComplete) {
          console.log('Application marked as complete successfully');
          applicationSubmitted.current = true;
        }
        
        return true;
      } catch (supabaseError) {
        console.error("Detailed Supabase error during save progress:", supabaseError);
        
        if (supabaseError instanceof Error) {
          setError(`Supabase error details: ${supabaseError.message}`);
        } else {
          setError(`Unknown Supabase error: ${JSON.stringify(supabaseError)}`);
        }
        
        if (!isComplete) {
          toast({
            title: "Local Save Only",
            description: "Your progress has been saved locally. We'll try to sync with our servers later.",
            variant: "default",
          });
          
          setIsSavingProgress(false);
          return true;
        } else {
          toast({
            title: "Submission Error",
            description: "There was a problem submitting your application to our servers.",
            variant: "destructive",
          });
          
          setIsSavingProgress(false);
          return false;
        }
      }
    } catch (error) {
      console.error("Detailed error saving application progress:", error);
      
      if (error instanceof Error) {
        setError(`Error details: ${error.message}`);
      } else {
        setError(`Unknown error: ${JSON.stringify(error)}`);
      }
      
      toast({
        title: "Warning",
        description: "We've encountered an issue saving your progress. You can continue, but please don't close your browser.",
        variant: "destructive",
      });
      
      setIsSavingProgress(false);
      return !isComplete;
    }
  };

  const nextStep = () => {
    localStorage.setItem('applicationDraft', JSON.stringify(formData));
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
    
    if (applicationSubmitted.current) {
      console.log("⚠️ Skipping nextStep auto-save: Application already submitted");
      return;
    }
    
    console.log("nextStep called, saving progress and advancing to step", currentStep + 1);
    saveProgress(formData)
      .catch(err => {
        console.error("Background save failed:", err);
      });
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
      
      setIsSubmitting(true);
      setError(null);
      
      finalSubmissionInProgress.current = true;
      
      localStorage.setItem('applicationDraft', JSON.stringify(formData));
      console.log("Saved to localStorage");
      
      try {
        console.log("Submitting to server with complete flag");
        const success = await saveProgress(formData, true);
        
        if (success) {
          console.log("✅ Application submitted successfully");
          applicationSubmitted.current = true;
          
          localStorage.removeItem('applicationDraft');
          localStorage.removeItem('applicationDraftId');
          setDraftId(null);
          
          toast({
            title: "Application Submitted!",
            description: "Thank you for applying with Ontario Loans. We'll be in touch soon.",
            variant: "default",
          });
          
          setTimeout(() => {
            onSuccessfulSubmit();
          }, 2000);
        } else {
          console.error("Failed to submit application - saveProgress returned false");
          throw new Error("Failed to submit application to server");
        }
      } catch (submitError) {
        console.error("Error during final submission:", submitError);
        
        if (submitError instanceof Error) {
          setError(`Submission error details: ${submitError.message}`);
        } else {
          setError(`Unknown submission error: ${JSON.stringify(submitError)}`);
        }
        
        toast({
          title: "Submission Error",
          description: "There was a problem submitting your application. See details below.",
          variant: "destructive",
        });
        
        setIsSubmitting(false);
        finalSubmissionInProgress.current = false;
      }
    } catch (error) {
      console.error("Unhandled error in handleSubmit:", error);
      
      if (error instanceof Error) {
        setError(`Error details: ${error.message}`);
      } else {
        setError(`Unknown error: ${JSON.stringify(error)}`);
      }
      
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
