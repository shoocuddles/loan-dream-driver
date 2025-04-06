
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSystemSettings, updateSystemSettings } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { SystemSettings } from "@/lib/types/supabase";

const PricingSettings = () => {
  const [standardPrice, setStandardPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [lockoutPeriod, setLockoutPeriod] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await getSystemSettings();
      
      if (settings) {
        console.log("Loaded system settings:", settings);
        setStandardPrice(settings.standardPrice.toString());
        setDiscountedPrice(settings.discountedPrice.toString());
        setLockoutPeriod(settings.lockoutPeriodHours.toString());
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validate inputs
      const standard = parseFloat(standardPrice);
      const discounted = parseFloat(discountedPrice);
      const lockHours = parseInt(lockoutPeriod);
      
      if (isNaN(standard) || standard <= 0) {
        toast({
          title: "Invalid Price",
          description: "Standard price must be a positive number.",
          variant: "destructive",
        });
        return;
      }
      
      if (isNaN(discounted) || discounted <= 0) {
        toast({
          title: "Invalid Price",
          description: "Discounted price must be a positive number.",
          variant: "destructive",
        });
        return;
      }
      
      if (discounted >= standard) {
        toast({
          title: "Invalid Pricing",
          description: "Discounted price must be lower than the standard price.",
          variant: "destructive",
        });
        return;
      }
      
      if (isNaN(lockHours) || lockHours <= 0) {
        toast({
          title: "Invalid Lockout Period",
          description: "Lockout period must be a positive number of hours.",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Saving system settings:", {
        standardPrice: standard,
        discountedPrice: discounted,
        lockoutPeriodHours: lockHours
      });
      
      // Save settings
      const result = await updateSystemSettings({
        standardPrice: standard,
        discountedPrice: discounted,
        lockoutPeriodHours: lockHours
      });
      
      console.log("Update system settings result:", result);
      
      if (result) {
        toast({
          title: "Settings Saved",
          description: "Pricing settings have been updated successfully.",
        });
        
        // Reload settings after a short delay to ensure DB has updated
        setTimeout(() => {
          loadSettings();
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to save pricing settings. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save pricing settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Pricing Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="px-3 py-2 bg-blue-50 text-blue-700 text-sm mb-4 rounded-md">
          These are the default pricing settings that will apply to all companies unless they have custom pricing configured.
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="standardPrice">Standard Download Price</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
            <Input 
              id="standardPrice"
              value={standardPrice}
              onChange={e => setStandardPrice(e.target.value)}
              placeholder="e.g. 10.99"
              className="pl-7"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="discountedPrice">Discounted Download Price</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
            <Input 
              id="discountedPrice"
              value={discountedPrice}
              onChange={e => setDiscountedPrice(e.target.value)}
              placeholder="e.g. 5.99"
              className="pl-7"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-gray-500">Price after initial lockout period expires</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lockoutPeriod">Lockout Period (hours)</Label>
          <Input 
            id="lockoutPeriod"
            value={lockoutPeriod}
            onChange={e => setLockoutPeriod(e.target.value)}
            placeholder="e.g. 2"
            disabled={isLoading}
            type="number"
          />
          <p className="text-xs text-gray-500">How long applications are locked for other dealers after download</p>
        </div>
        
        <Button 
          className="w-full mt-4 bg-ontario-blue hover:bg-ontario-blue/90" 
          onClick={handleSave}
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PricingSettings;
