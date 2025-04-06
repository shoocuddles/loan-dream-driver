
import { useState } from "react";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApplicationFormStep1Props {
  formData: ApplicationForm;
  updateFormData: (data: Partial<ApplicationForm>) => void;
  nextStep: () => void;
}

const ApplicationFormStep1 = ({ formData, updateFormData, nextStep }: ApplicationFormStep1Props) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    
    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
    }
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.streetAddress) newErrors.streetAddress = "Street address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.province) newErrors.province = "Province is required";
    
    if (!formData.postalCode) {
      newErrors.postalCode = "Postal code is required";
    } else if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(formData.postalCode)) {
      newErrors.postalCode = "Please enter a valid postal code (e.g., A1A 1A1)";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      nextStep();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-ontario-blue mb-6">Personal Information</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => updateFormData({ fullName: e.target.value })}
            className={errors.fullName ? "border-red-500" : ""}
          />
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
        </div>
        
        <div>
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => updateFormData({ phoneNumber: e.target.value })}
            placeholder="(xxx) xxx-xxxx"
            className={errors.phoneNumber ? "border-red-500" : ""}
          />
          {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
        </div>
        
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>
        
        <div>
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input
            id="streetAddress"
            value={formData.streetAddress}
            onChange={(e) => updateFormData({ streetAddress: e.target.value })}
            className={errors.streetAddress ? "border-red-500" : ""}
          />
          {errors.streetAddress && <p className="text-red-500 text-sm mt-1">{errors.streetAddress}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateFormData({ city: e.target.value })}
              className={errors.city ? "border-red-500" : ""}
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>
          
          <div>
            <Label htmlFor="province">Province</Label>
            <Select 
              value={formData.province} 
              onValueChange={(value: 'Ontario' | 'Quebec') => updateFormData({ province: value })}
            >
              <SelectTrigger className={errors.province ? "border-red-500" : ""}>
                <SelectValue placeholder="Select a province" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ontario">Ontario</SelectItem>
                <SelectItem value="Quebec">Quebec</SelectItem>
              </SelectContent>
            </Select>
            {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province}</p>}
          </div>
        </div>
        
        <div>
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => updateFormData({ postalCode: e.target.value })}
            placeholder="A1A 1A1"
            className={errors.postalCode ? "border-red-500" : ""}
          />
          {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
        </div>
      </div>
      
      <div className="pt-4">
        <Button type="submit" className="w-full bg-ontario-blue hover:bg-ontario-blue/90">Continue to Vehicle Details</Button>
      </div>
    </form>
  );
};

export default ApplicationFormStep1;
