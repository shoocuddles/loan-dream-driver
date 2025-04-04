
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
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
  const [draftId, setDraftId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load draft from localStorage if exists
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
      // Save to localStorage as a backup
      localStorage.setItem('applicationDraft', JSON.stringify(data));
      
      // Save to Supabase with draft status
      const applicationData = {
        ...data,
        isComplete
      };
      
      const result = draftId 
        ? await submitApplication({ ...applicationData, id: draftId }, true) 
        : await submitApplication(applicationData, true);
      
      // Save the draft ID if we get one back
      if (result && result.id && !draftId) {
        setDraftId(result.id);
        localStorage.setItem('applicationDraftId', result.id);
      }
      
      return true;
    } catch (error) {
      console.error("Error saving application progress:", error);
      
      // If Supabase fails, we still have localStorage backup
      toast({
        title: "Warning",
        description: "We've saved your progress locally, but couldn't connect to our servers. Your data will be submitted when you complete the application.",
        variant: "default",
      });
      
      return false;
    }
  };

  const nextStep = async () => {
    // Save progress when moving to next step
    await saveProgress(formData);
    
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const updateFormData = (data: Partial<ApplicationForm>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Final submission (mark as complete)
      const success = await saveProgress(formData, true);
      
      if (success) {
        // Clear draft data
        localStorage.removeItem('applicationDraft');
        localStorage.removeItem('applicationDraftId');
        setDraftId(null);
        
        toast({
          title: "Application Submitted!",
          description: "Thank you for applying with Ontario Loans. We'll be in touch soon.",
          variant: "default",
        });
        
        // Redirect to homepage
        navigate("/");
      } else {
        throw new Error("Failed to submit application");
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Submission Error",
        description: "There was a problem submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              
              {draftId && (
                <div className="mt-4 px-4 py-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    Your progress is being saved automatically. You can return to complete your application later.
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
