
import { useState } from "react";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApplicationFormStep2Props {
  formData: ApplicationForm;
  updateFormData: (data: Partial<ApplicationForm>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const ApplicationFormStep2 = ({ formData, updateFormData, nextStep, prevStep }: ApplicationFormStep2Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.vehicleType) newErrors.vehicleType = "Vehicle type is required";
    
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
      <h2 className="text-2xl font-bold text-center text-ontario-blue mb-6">Desired Vehicle Details</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="vehicleType">Preferred Vehicle Type</Label>
          <Select 
            value={formData.vehicleType} 
            onValueChange={(value: 'Car' | 'SUV' | 'Truck' | 'Van') => updateFormData({ vehicleType: value })}
          >
            <SelectTrigger className={errors.vehicleType ? "border-red-500" : ""}>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Car">Car</SelectItem>
              <SelectItem value="SUV">SUV</SelectItem>
              <SelectItem value="Truck">Truck</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
            </SelectContent>
          </Select>
          {errors.vehicleType && <p className="text-red-500 text-sm mt-1">{errors.vehicleType}</p>}
        </div>
        
        <div>
          <Label htmlFor="requiredFeatures">Required Features</Label>
          <Textarea
            id="requiredFeatures"
            value={formData.requiredFeatures}
            onChange={(e) => updateFormData({ requiredFeatures: e.target.value })}
            placeholder="e.g., Backup camera, Bluetooth, Heated seats"
          />
        </div>
        
        <div>
          <Label htmlFor="unwantedColors">Colors You Don't Like</Label>
          <Input
            id="unwantedColors"
            value={formData.unwantedColors}
            onChange={(e) => updateFormData({ unwantedColors: e.target.value })}
            placeholder="e.g., Red, Yellow"
          />
        </div>
        
        <div>
          <Label htmlFor="preferredMakeModel">Preferred Make & Model (Optional)</Label>
          <Input
            id="preferredMakeModel"
            value={formData.preferredMakeModel}
            onChange={(e) => updateFormData({ preferredMakeModel: e.target.value })}
            placeholder="e.g., Honda Civic, Toyota RAV4"
          />
        </div>
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
          Continue to Existing Loan Info
        </Button>
      </div>
    </form>
  );
};

export default ApplicationFormStep2;
