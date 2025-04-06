
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAllCompaniesWithPricing, updateCompanyPricing } from "@/lib/companyService";
import { CompanyPricing } from "@/lib/types/company";
import { Edit, Save, X } from "lucide-react";

const CompanyPricingSettings = () => {
  const [companies, setCompanies] = useState<CompanyPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    standardPrice: string;
    discountedPrice: string;
  }>({
    standardPrice: "",
    discountedPrice: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await getAllCompaniesWithPricing();
      console.log("Loaded companies with pricing:", data);
      setCompanies(data);
    } catch (error: any) {
      console.error("Error loading companies:", error);
      toast({
        title: "Error",
        description: "Failed to load company pricing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company: CompanyPricing) => {
    setEditingId(company.companyId);
    setEditValues({
      standardPrice: company.standardPrice.toString(),
      discountedPrice: company.discountedPrice.toString(),
    });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = async (companyId: string) => {
    try {
      const standardPrice = parseFloat(editValues.standardPrice);
      const discountedPrice = parseFloat(editValues.discountedPrice);
      
      // Validate inputs
      if (isNaN(standardPrice) || standardPrice <= 0) {
        toast({
          title: "Invalid Price",
          description: "Standard price must be a positive number.",
          variant: "destructive",
        });
        return;
      }
      
      if (isNaN(discountedPrice) || discountedPrice <= 0) {
        toast({
          title: "Invalid Price",
          description: "Discounted price must be a positive number.",
          variant: "destructive",
        });
        return;
      }
      
      if (discountedPrice >= standardPrice) {
        toast({
          title: "Invalid Pricing",
          description: "Discounted price must be lower than the standard price.",
          variant: "destructive",
        });
        return;
      }

      const response = await updateCompanyPricing({
        companyId,
        standardPrice,
        discountedPrice
      });

      if (response.success) {
        toast({
          title: "Pricing Updated",
          description: "Company pricing has been updated successfully.",
        });
        
        // Update the local state
        setCompanies(prevCompanies => 
          prevCompanies.map(company => 
            company.companyId === companyId 
              ? {
                  ...company,
                  standardPrice,
                  discountedPrice,
                  isCustomPricing: true
                }
              : company
          )
        );
        
        setEditingId(null);
      } else {
        toast({
          title: "Update Failed",
          description: response.message || "Failed to update company pricing.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error saving company pricing:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: 'standardPrice' | 'discountedPrice', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Pricing Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <svg className="animate-spin h-6 w-6 text-ontario-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">No companies found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {companies.map((company) => (
              <div key={company.companyId} className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-lg">{company.name}</h3>
                  
                  {editingId === company.companyId ? (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel()}
                      >
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(company.companyId)}
                      >
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(company)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit Pricing
                    </Button>
                  )}
                </div>
                
                {company.isCustomPricing && (
                  <div className="mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Custom Pricing
                    </span>
                  </div>
                )}

                {editingId === company.companyId ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor={`standard-${company.companyId}`}>Standard Price</Label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            id={`standard-${company.companyId}`}
                            value={editValues.standardPrice}
                            onChange={(e) => handleInputChange('standardPrice', e.target.value)}
                            className="pl-7"
                            type="number"
                            step="0.01"
                            min="0.01"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`discounted-${company.companyId}`}>Discounted Price</Label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            id={`discounted-${company.companyId}`}
                            value={editValues.discountedPrice}
                            onChange={(e) => handleInputChange('discountedPrice', e.target.value)}
                            className="pl-7"
                            type="number"
                            step="0.01"
                            min="0.01"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Note: Discounted price must be lower than standard price.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Standard Price:</span>
                      <p className="font-medium">${company.standardPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Discounted Price:</span>
                      <p className="font-medium">${company.discountedPrice.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyPricingSettings;
