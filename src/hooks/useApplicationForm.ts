
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
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (err) {
        console.error("❌ Error parsing saved draft:", err);
      }
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
      console.log('📂 Saved application data to localStorage');
      
      try {
        const applicationData = {
          ...data,
          isComplete,
          status: isComplete ? 'submitted' : 'draft'
        };
        
        console.log('🔄 Preparing to submit application data:', 
          isComplete ? 'FINAL SUBMISSION' : 'Draft save', 
          draftId ? `with ID: ${draftId}` : 'new application');
        
        let result = null;
        try {
          if (draftId) {
            console.log('🔄 Updating existing draft with ID:', draftId);
            result = await submitApplication({ ...applicationData, id: draftId }, !isComplete);
            console.log('🔄 Update application result:', result);
          } else {
            console.log('➕ Creating new application', isComplete ? '(COMPLETE)' : '(draft)');
            result = await submitApplication(applicationData, !isComplete);
            console.log('➕ Create application result:', result);
          }
          
          if (result && result.id && !draftId) {
            console.log('🔑 Setting draft ID:', result.id);
            setDraftId(result.id);
            localStorage.setItem('applicationDraftId', result.id);
          }
          
          setIsSavingProgress(false);
          
          if (isComplete) {
            console.log('✅ Application marked as complete successfully');
            applicationSubmitted.current = true;
            
            toast({
              title: "Application Submitted!",
              description: "Thank you for applying. We've received your submission.",
              variant: "default",
            });
          }
          
          return true;
        } catch (supabaseError: any) {
          console.error("❌ Detailed Supabase error during save progress:", supabaseError);
          
          // More detailed error logging
          if (supabaseError.status) {
            console.error(`❌ HTTP Status: ${supabaseError.status}`);
          }
          
          if (supabaseError.message) {
            console.error(`❌ Error message: ${supabaseError.message}`);
          }
          
          if (supabaseError.details) {
            console.error(`❌ Error details: ${supabaseError.details}`);
          }
          
          const errorMessage = supabaseError?.message || 'Unknown error occurred';
          setError(`Supabase error details: ${errorMessage}`);
          
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
      } catch (error: any) {
        console.error("❌ Detailed error saving application progress:", error);
        
        const errorMessage = error?.message || 'Unknown error occurred';
        setError(`Error details: ${errorMessage}`);
        
        toast({
          title: "Warning",
          description: "We've encountered an issue saving your progress. You can continue, but please don't close your browser.",
          variant: "destructive",
        });
        
        setIsSavingProgress(false);
        return !isComplete;
      }
    } catch (error: any) {
      console.error("❌ Unhandled error in saveProgress:", error);
      
      const errorMessage = error?.message || 'Unknown error occurred';
      setError(`Error details: ${errorMessage}`);
      
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
        console.error("❌ Background save failed:", err);
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
          console.error("❌ Failed to submit application - saveProgress returned false");
          throw new Error("Failed to submit application to server");
        }
      } catch (submitError: any) {
        console.error("❌ Error during final submission:", submitError);
        
        // Additional diagnostic information
        if (submitError.code) {
          console.error(`❌ Error code: ${submitError.code}`);
        }
        
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
