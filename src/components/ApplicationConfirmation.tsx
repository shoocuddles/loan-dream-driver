import { useState } from "react";
import { ApplicationForm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Edit, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ApplicationConfirmationProps {
  formData: ApplicationForm;
  submittedData: any;
  updateData: (data: Partial<ApplicationForm>) => Promise<void>;
  isSubmitting: boolean;
}

const ApplicationConfirmation = ({
  formData,
  submittedData,
  updateData,
  isSubmitting
}: ApplicationConfirmationProps) => {
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const { toast } = useToast();

  // Format submission date to be user-friendly
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Convert field name to label
  const fieldToLabel = (field: string): string => {
    // Handle special cases
    if (field === "fullName") return "Full Name";
    if (field === "phoneNumber") return "Phone Number";
    if (field === "streetAddress") return "Street Address";
    if (field === "postalCode") return "Postal Code";
    if (field === "vehicleType") return "Vehicle Type";
    if (field === "requiredFeatures") return "Required Features";
    if (field === "unwantedColors") return "Unwanted Colors";
    if (field === "preferredMakeModel") return "Preferred Make & Model";
    if (field === "hasExistingLoan") return "Has Existing Loan";
    if (field === "currentPayment") return "Current Payment";
    if (field === "amountOwed") return "Amount Owed";
    if (field === "currentVehicle") return "Current Vehicle";
    if (field === "employmentStatus") return "Employment Status";
    if (field === "monthlyIncome") return "Monthly Income";
    if (field === "additionalNotes") return "Additional Notes";
    
    // Default: convert camelCase to Title Case
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };
  
  // Handle field edit
  const startEdit = (field: string, value: string) => {
    setEditMode(field);
    setEditValue(value);
  };
  
  // Save edited field
  const saveEdit = async () => {
    if (!editMode) return;
    
    try {
      // Create update object with the field being edited
      const updateObject: Partial<ApplicationForm> = {
        [editMode]: editValue
      };
      
      // Special handling for boolean values
      if (editMode === "hasExistingLoan") {
        updateObject.hasExistingLoan = editValue === "true";
      }
      
      await updateData(updateObject);
      
      // Exit edit mode after successful update
      setEditMode(null);
      
      toast({
        title: "Field Updated",
        description: `${fieldToLabel(editMode)} has been updated successfully.`,
      });
    } catch (error) {
      console.error("❌ Error updating field:", error);
      
      toast({
        title: "Update Failed",
        description: "There was an error updating this field. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditMode(null);
  };

  // Generate sections based on form data
  const renderSection = (title: string, fields: Array<{key: keyof ApplicationForm, editable?: boolean}>) => {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Application submitted on {formatDate(submittedData?.created_at || new Date().toISOString())}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map(({ key, editable = true }) => {
              const value = formData[key]?.toString() || "";
              const isEditing = editMode === key;
              
              // Skip empty fields
              if (!value && key !== "additionalNotes") return null;
              
              // Format boolean values
              const displayValue = typeof formData[key] === "boolean" 
                ? (formData[key] ? "Yes" : "No") 
                : value;
              
              return (
                <div key={key.toString()} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor={key.toString()} className="font-medium text-sm">
                      {fieldToLabel(key.toString())}
                    </Label>
                    
                    {editable && !isEditing && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => startEdit(key.toString(), value)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      {key === "additionalNotes" ? (
                        <Textarea
                          id={key.toString()}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={4}
                        />
                      ) : (
                        <Input
                          id={key.toString()}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                      )}
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={cancelEdit}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={saveEdit}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-2 rounded text-gray-700">
                      {key === "additionalNotes" && !value ? (
                        <span className="text-gray-400 italic">No additional notes provided</span>
                      ) : (
                        displayValue
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-center text-green-600 mb-2">Application Submitted Successfully</h2>
        <p className="text-gray-600">
          Thank you for your application! Here's a summary of your submission.
          <br />You can edit any information below if needed.
        </p>
      </div>

      <div className="border border-green-200 bg-green-50 rounded-md p-4 mb-6">
        <p className="text-green-700 text-sm flex items-center">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Your application has been received and is being reviewed. If we need additional information, we'll contact you.
        </p>
      </div>
      
      <div className="bg-white rounded-lg">
        {/* Personal Information Section */}
        {renderSection("Personal Information", [
          { key: "fullName" },
          { key: "phoneNumber" },
          { key: "email" },
          { key: "streetAddress" },
          { key: "city" },
          { key: "province" },
          { key: "postalCode" }
        ])}

        {/* Vehicle Details Section */}
        {renderSection("Vehicle Details", [
          { key: "vehicleType" },
          { key: "preferredMakeModel" },
          { key: "requiredFeatures" },
          { key: "unwantedColors" }
        ])}

        {/* Existing Loan Section - Only show if hasExistingLoan is true */}
        {formData.hasExistingLoan && renderSection("Existing Loan Information", [
          { key: "hasExistingLoan", editable: false },
          { key: "currentVehicle" },
          { key: "currentPayment" },
          { key: "amountOwed" },
          { key: "mileage" }
        ])}

        {/* Financial Information Section */}
        {renderSection("Financial Information", [
          { key: "employmentStatus" },
          { key: "monthlyIncome" },
          { key: "additionalNotes" }
        ])}
      </div>

      <Separator className="my-6" />
      
      <div className="text-center text-sm text-gray-500">
        <p>Application ID: {submittedData?.id || "Processing"}</p>
        <p>Submitted: {formatDate(submittedData?.created_at || new Date().toISOString())}</p>
        <p>Status: {submittedData?.status || "In Review"}</p>
      </div>
    </div>
  );
};

export default ApplicationConfirmation;
