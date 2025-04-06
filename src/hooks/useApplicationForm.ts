
import { useState, useRef, useCallback, useEffect } from "react";
import { ApplicationForm } from "@/lib/types";
import { submitApplicationToSupabase } from "@/lib/applicationService";
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
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const { toast } = useToast();
  const finalSubmissionInProgress = useRef(false);
  const applicationSubmitted = useRef(false);
  
  const { draftId, isSavingProgress, saveDraft, clearDraft } = useApplicationDraft(initialFormState);

  useEffect(() => {
    // Load any saved form data from localStorage on mount
    const savedDraft = localStorage.getItem('applicationDraft');
    if (savedDraft) {
      try {
        const parsedData = JSON.parse(savedDraft);
        setFormData(parsedData);
      } catch (err) {
        console.error("❌ Error parsing saved draft data:", err);
      }
    }
  }, []);

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
          toast({
            title: "Save Error",
            description: "Could not save your progress. Please try again.",
            variant: "destructive",
          });
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

  // For updating already submitted application
  const updateSubmittedApplication = async (updatedData: Partial<ApplicationForm>) => {
    if (!submittedData || !submittedData.id) {
      console.error("❌ Cannot update: No submitted application data available");
      toast({
        title: "Update Error",
        description: "Cannot update application: No submission data found.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create updated application data
      const applicationToUpdate = { 
        ...formData, 
        ...updatedData,
        applicationId: submittedData.id 
      };
      
      console.log("🔄 Updating submitted application:", applicationToUpdate);
      
      // Use submitApplicationToSupabase with isDraft=false to update as complete
      const result = await submitApplicationToSupabase(applicationToUpdate, false);
      
      if (result) {
        console.log("✅ Application updated successfully:", result);
        
        // Update our local state with the new data
        setFormData(prev => ({ ...prev, ...updatedData }));
        setSubmittedData(result);
        
        toast({
          title: "Update Successful",
          description: "Your application has been updated successfully.",
          variant: "default",
        });
      } else {
        throw new Error("Failed to update application - no data returned");
      }
    } catch (error: any) {
      console.error("❌ Error updating application:", error);
      setError(`Update error: ${error.message}`);
      
      toast({
        title: "Update Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        
        // Direct call to submitApplicationToSupabase with isDraft=false for final submission
        const result = await submitApplicationToSupabase(applicationToSubmit, false);
        console.log("📊 submitApplicationToSupabase result received:", result);
        
        if (result) {
          console.log("✅ Application submitted successfully:", result);
          applicationSubmitted.current = true;
          
          // Save the submitted data for the confirmation page
          setSubmittedData(result);
          setSubmissionComplete(true);
          
          // Clear draft after successful submission
          clearDraft();
          
          toast({
            title: "Application Submitted!",
            description: "Thank you for applying with Ontario Loans. We'll be in touch soon.",
            variant: "default",
          });
          
          // Move to confirmation step rather than navigating away
          setCurrentStep(5); // Step 5 will be our confirmation page
          window.scrollTo(0, 0);
        } else {
          console.error("❌ Failed to submit application - submitApplicationToSupabase returned falsy value");
          setError("Failed to submit application. Please try again.");
          
          toast({
            title: "Submission Error",
            description: "Failed to submit your application. Please try again.",
            variant: "destructive",
          });
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
          description: "There was a problem submitting your application: " + errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("❌ Unhandled error in handleSubmit:", error);
      
      if (error.stack) {
        console.error("❌ Stack trace:", error.stack);
      }
      
      const errorMessage = error?.message || 'Unknown error';
      setError(`Error details: ${errorMessage}`);
      
      toast({
        title: "Submission Error",
        description: "There was a problem submitting your application: " + errorMessage,
        variant: "destructive",
      });
    } finally {
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
    submissionComplete,
    submittedData,
    updateFormData,
    updateSubmittedApplication,
    nextStep,
    prevStep,
    handleSubmit
  };
};
