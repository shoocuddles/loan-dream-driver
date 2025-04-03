
import { useState } from "react";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ApplicationFormStep3Props {
  formData: ApplicationForm;
  updateFormData: (data: Partial<ApplicationForm>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const ApplicationFormStep3 = ({ formData, updateFormData, nextStep, prevStep }: ApplicationFormStep3Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.hasExistingLoan) {
      if (!formData.currentPayment) newErrors.currentPayment = "Current payment amount is required";
      if (!formData.amountOwed) newErrors.amountOwed = "Amount owed is required";
      if (!formData.currentVehicle) newErrors.currentVehicle = "Current vehicle details are required";
      if (!formData.mileage) newErrors.mileage = "Current vehicle mileage is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      nextStep();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-ontario-blue mb-6">Existing Car Loan Information</h2>
      
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="hasExistingLoan"
            checked={formData.hasExistingLoan}
            onCheckedChange={(checked) => {
              updateFormData({ 
                hasExistingLoan: checked,
                // Reset values if toggling off
                currentPayment: checked ? formData.currentPayment : '',
                amountOwed: checked ? formData.amountOwed : '',
                currentVehicle: checked ? formData.currentVehicle : '',
                mileage: checked ? formData.mileage : ''
              });
            }}
          />
          <Label htmlFor="hasExistingLoan" className="font-medium">I currently have a car loan</Label>
        </div>
        
        {formData.hasExistingLoan && (
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="currentPayment">Current Monthly Payment ($)</Label>
              <Input
                id="currentPayment"
                value={formData.currentPayment}
                onChange={(e) => updateFormData({ currentPayment: e.target.value })}
                placeholder="e.g., 350"
                className={errors.currentPayment ? "border-red-500" : ""}
              />
              {errors.currentPayment && <p className="text-red-500 text-sm mt-1">{errors.currentPayment}</p>}
            </div>
            
            <div>
              <Label htmlFor="amountOwed">Amount Owed ($)</Label>
              <Input
                id="amountOwed"
                value={formData.amountOwed}
                onChange={(e) => updateFormData({ amountOwed: e.target.value })}
                placeholder="e.g., 12500"
                className={errors.amountOwed ? "border-red-500" : ""}
              />
              {errors.amountOwed && <p className="text-red-500 text-sm mt-1">{errors.amountOwed}</p>}
            </div>
            
            <div>
              <Label htmlFor="currentVehicle">Current Vehicle Make & Model</Label>
              <Input
                id="currentVehicle"
                value={formData.currentVehicle}
                onChange={(e) => updateFormData({ currentVehicle: e.target.value })}
                placeholder="e.g., Honda Civic 2018"
                className={errors.currentVehicle ? "border-red-500" : ""}
              />
              {errors.currentVehicle && <p className="text-red-500 text-sm mt-1">{errors.currentVehicle}</p>}
            </div>
            
            <div>
              <Label htmlFor="mileage">Current Odometer Reading (km)</Label>
              <Input
                id="mileage"
                value={formData.mileage}
                onChange={(e) => updateFormData({ mileage: e.target.value })}
                placeholder="e.g., 65000"
                className={errors.mileage ? "border-red-500" : ""}
              />
              {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage}</p>}
            </div>
          </div>
        )}
      </div>
      
      <div className="pt-4 flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={prevStep}
        >
          Back
        </Button>
        <Button type="submit" className="bg-ontario-blue hover:bg-ontario-blue/90">
          Continue to Income Details
        </Button>
      </div>
    </form>
  );
};

export default ApplicationFormStep3;
