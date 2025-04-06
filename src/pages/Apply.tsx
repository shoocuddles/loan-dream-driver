import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApplicationFormStep1 from "@/components/ApplicationFormStep1";
import ApplicationFormStep2 from "@/components/ApplicationFormStep2";
import ApplicationFormStep3 from "@/components/ApplicationFormStep3";
import ApplicationFormStep4 from "@/components/ApplicationFormStep4";
import { ApplicationForm } from "@/lib/types";
import { submitApplication } from "@/lib/supabase";

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

const Apply = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const finalSubmissionInProgress = useRef(false);
  const applicationSubmitted = useRef(false);

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
            navigate("/");
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
              
              <div className="mt-8 flex justify-between items-center">
                {[1, 2, 3, 4].map((step) => (
                  <div 
                    key={step} 
                    className={`flex flex-col items-center ${step < currentStep ? 'text-ontario-blue' : step === currentStep ? 'text-ontario-blue font-bold' : 'text-gray-400'}`}
                  >
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                        step < currentStep 
                          ? 'bg-ontario-blue text-white' 
                          : step === currentStep 
                            ? 'bg-ontario-lightblue text-white' 
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step}
                    </div>
                    <div className="text-xs text-center hidden md:block">
                      {step === 1 && "Personal Info"}
                      {step === 2 && "Vehicle Details"}
                      {step === 3 && "Current Loan"}
                      {step === 4 && "Income"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {renderStep()}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Apply;
