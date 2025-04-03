
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ApplicationFormStep4Props {
  formData: ApplicationForm;
  updateFormData: (data: Partial<ApplicationForm>) => void;
  prevStep: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ApplicationFormStep4 = ({ 
  formData, 
  updateFormData, 
  prevStep, 
  onSubmit,
  isSubmitting 
}: ApplicationFormStep4Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.employmentStatus) newErrors.employmentStatus = "Employment status is required";
    if (!formData.monthlyIncome) newErrors.monthlyIncome = "Monthly income is required";
    if (!acceptTerms) newErrors.acceptTerms = "You must accept the terms and conditions";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-ontario-blue mb-6">Income Details</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="employmentStatus">Employment Status</Label>
          <Select 
            value={formData.employmentStatus} 
            onValueChange={(value: any) => updateFormData({ employmentStatus: value })}
          >
            <SelectTrigger className={errors.employmentStatus ? "border-red-500" : ""}>
              <SelectValue placeholder="Select your employment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employed">Employed</SelectItem>
              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
              <SelectItem value="Unemployed">Unemployed</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="Disability">On Disability</SelectItem>
            </SelectContent>
          </Select>
          {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>}
        </div>
        
        <div>
          <Label htmlFor="monthlyIncome">Monthly Income ($)</Label>
          <Input
            id="monthlyIncome"
            value={formData.monthlyIncome}
            onChange={(e) => updateFormData({ monthlyIncome: e.target.value })}
            className={errors.monthlyIncome ? "border-red-500" : ""}
          />
          {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
        </div>
        
        <div>
          <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
          <Textarea
            id="additionalNotes"
            value={formData.additionalNotes}
            onChange={(e) => updateFormData({ additionalNotes: e.target.value })}
            placeholder="Any additional information that might help with your application"
          />
        </div>
        
        <div className="pt-4">
          <div className="flex items-start space-x-2 mb-4">
            <Checkbox 
              id="acceptTerms" 
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              className={errors.acceptTerms ? "border-red-500" : ""}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="acceptTerms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm that all details are accurate and I authorize Ontario Loans to conduct a soft credit check.
              </label>
            </div>
          </div>
          {errors.acceptTerms && <p className="text-red-500 text-sm mb-4">{errors.acceptTerms}</p>}
          
          <p className="text-sm text-gray-500 mb-6">
            By submitting this application, you agree to our{" "}
            <Link to="/terms" className="text-ontario-blue underline hover:text-ontario-lightblue" target="_blank">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-ontario-blue underline hover:text-ontario-lightblue" target="_blank">
              Privacy Policy
            </Link>.
          </p>
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
        <Button 
          type="submit" 
          className="bg-ontario-blue hover:bg-ontario-blue/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
      </div>
    </form>
  );
};

export default ApplicationFormStep4;
