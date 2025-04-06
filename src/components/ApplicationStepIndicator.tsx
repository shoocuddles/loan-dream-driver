
import React from 'react';

interface ApplicationStepIndicatorProps {
  currentStep: number;
}

const ApplicationStepIndicator: React.FC<ApplicationStepIndicatorProps> = ({ currentStep }) => {
  return (
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
  );
};

export default ApplicationStepIndicator;
