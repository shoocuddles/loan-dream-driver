
import { useState, useRef, useCallback, useEffect } from "react";
import { ApplicationForm } from "@/lib/types";
import { submitApplicationToSupabase } from "@/lib/applicationService";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { useApplicationDraft } from "./useApplicationDraft";
import { checkNetworkConnectivity, diagnoseConnectionIssues } from "@/integrations/supabase/client";

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
  employerName: "",  // Added new field with empty default
  jobTitle: "",      // Added new field with empty default
  employmentDuration: "", // Added new field with empty default
  additionalNotes: ""
};

// 10 minutes in milliseconds
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

export const useApplicationForm = (onSuccessfulSubmit: () => void) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const { toast: uiToast } = useToast();
  const finalSubmissionInProgress = useRef(false);
  const applicationSubmitted = useRef(false);
  const submissionAttempts = useRef(0);
  const inactivityTimer = useRef<number | null>(null);
  
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
    
    // Initialize the inactivity timer
    resetInactivityTimer();
    
    // Cleanup timer on unmount
    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);
  
  // Reset the inactivity timer whenever there's user activity
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    
    // Only set timer if we have a draft and haven't submitted yet
    if (draftId && !applicationSubmitted.current) {
      inactivityTimer.current = window.setTimeout(() => {
        console.log("⏰ Application inactivity timeout reached (10 minutes)");
        if (!applicationSubmitted.current) {
          toast.info("Your application has been automatically submitted due to inactivity");
          uiToast({
            title: "Application Submitted",
            description: "Your application has been automatically submitted as you haven't completed it within 10 minutes.",
            variant: "default",
          });
          
          // Auto-submit the application
          autoSubmitApplication();
        }
      }, INACTIVITY_TIMEOUT);
    }
  };
  
  // Function to automatically submit the application after timeout
  const autoSubmitApplication = async () => {
    try {
      // Don't proceed if application is already submitted
      if (applicationSubmitted.current) {
        return;
      }
      
      setIsSubmitting(true);
      finalSubmissionInProgress.current = true;
      
      console.log("Auto-submitting application after inactivity timeout");
      
      const applicationToSubmit = draftId ? { ...formData, applicationId: draftId } : formData;
      
      // Call submitApplicationToSupabase with isDraft=false for final submission
      const result = await submitApplicationToSupabase(applicationToSubmit, false);
      
      if (result) {
        applicationSubmitted.current = true;
        setSubmittedData(result);
        setSubmissionComplete(true);
        
        // Clear draft after successful submission
        clearDraft();
        
        // Move to confirmation step
        setCurrentStep(5);
        window.scrollTo(0, 0);
      }
    } catch (error: any) {
      console.error("❌ Error during auto-submission:", error);
      setError(`Auto-submission error: ${error.message || 'Unknown error'}`);
      
      toast.error("There was a problem automatically submitting your application.");
      uiToast({
        title: "Submission Error",
        description: "There was a problem automatically submitting your application.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      finalSubmissionInProgress.current = false;
    }
  };

  const nextStep = () => {
    localStorage.setItem('applicationDraft', JSON.stringify(formData));
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
    
    // Reset the inactivity timer on navigation
    resetInactivityTimer();
    
    if (applicationSubmitted.current) {
      console.log("⚠️ Skipping nextStep auto-save: Application already submitted");
      return;
    }
    
    console.log("nextStep called, saving progress and advancing to step", currentStep + 1);
    
    if (!finalSubmissionInProgress.current) {
      saveDraft(formData)
        .catch(err => {
          console.error("❌ Background save failed:", err);
          uiToast({
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
    
    // Reset the inactivity timer on navigation
    resetInactivityTimer();
  };

  const updateFormData = (data: Partial<ApplicationForm>) => {
    if (applicationSubmitted.current) {
      console.log("⚠️ Skipping form update: Application already submitted");
      return;
    }
    
    // Reset the inactivity timer on form updates
    resetInactivityTimer();
    
    setFormData(prev => ({ ...prev, ...data }));
  };

  // For updating already submitted application
  const updateSubmittedApplication = async (updatedData: Partial<ApplicationForm>) => {
    // Reset the inactivity timer on form updates
    resetInactivityTimer();
    
    if (!submittedData || !submittedData.id) {
      console.error("❌ Cannot update: No submitted application data available");
      uiToast({
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
        
        toast.success("Application updated successfully");
        uiToast({
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
      
      toast.error(`Failed to update: ${error.message}`);
      uiToast({
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
      
      // Clear the inactivity timer when manually submitting
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      
      setIsSubmitting(true);
      setError(null);
      
      finalSubmissionInProgress.current = true;
      submissionAttempts.current += 1;
      
      // First check network connectivity
      const isNetworkConnected = await checkNetworkConnectivity();
      if (!isNetworkConnected) {
        const errorMsg = "Network connectivity issue detected. Please check your internet connection and try again.";
        console.error("❌ " + errorMsg);
        setError(errorMsg);
        setIsSubmitting(false);
        finalSubmissionInProgress.current = false;
        
        toast.error(errorMsg);
        uiToast({
          title: "Connection Error",
          description: errorMsg,
          variant: "destructive",
        });
        
        return;
      }
      
      // Save to localStorage first (this is fast and reliable)
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
          
          toast.success("Application submitted successfully!");
          uiToast({
            title: "Application Submitted!",
            description: "Thank you for applying with Ontario Loans. We'll be in touch soon.",
            variant: "default",
          });
          
          // Move to confirmation step rather than navigating away
          setCurrentStep(5); // Step 5 will be our confirmation page
          window.scrollTo(0, 0);
        } else {
          throw new Error("Failed to submit application - no result returned from server.");
        }
      } catch (submitError: any) {
        console.error("❌ Error during final submission:", submitError);
        
        if (submitError.stack) {
          console.error("❌ Stack trace:", submitError.stack);
        }
        
        // Diagnose connection issues
        const diagnosisResult = await diagnoseConnectionIssues();
        console.log("Connection diagnosis:", diagnosisResult);
        
        const errorMessage = submitError?.message || 'Unknown error';
        setError(`Submission error details: ${errorMessage}. ${diagnosisResult}`);
        
        toast.error("There was a problem submitting your application: " + errorMessage);
        uiToast({
          title: "Submission Error",
          description: "There was a problem submitting your application: " + errorMessage,
          variant: "destructive",
        });
        
        // Try to recover by saving as a draft
        try {
          console.log("Attempting to save as draft instead...");
          await saveDraft(formData);
          toast.info("Your application was saved as a draft. You can try submitting again.");
        } catch (draftError) {
          console.error("❌ Failed to save as draft:", draftError);
        }
      }
    } catch (error: any) {
      console.error("❌ Unhandled error in handleSubmit:", error);
      
      if (error.stack) {
        console.error("❌ Stack trace:", error.stack);
      }
      
      const errorMessage = error?.message || 'Unknown error';
      setError(`Error details: ${errorMessage}`);
      
      toast.error("There was a problem submitting your application: " + errorMessage);
      uiToast({
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
