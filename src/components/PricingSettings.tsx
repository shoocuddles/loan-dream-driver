
// Fix TypeScript error by ensuring lockoutPeriodHours is a string in the input
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSystemSettings, updateSystemSettings } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const PricingSettings = () => {
  const [standardPrice, setStandardPrice] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [lockoutPeriod, setLockoutPeriod] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getSystemSettings();
        
        setStandardPrice(settings.standardPrice.toString());
        setDiscountedPrice(settings.discountedPrice.toString());
        setLockoutPeriod(settings.lockoutPeriodHours.toString());
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
    
    loadSettings();
  }, [toast]);
  
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
      
      // Save settings
      await updateSystemSettings({
        standardPrice: standard,
        discountedPrice: discounted,
        lockoutPeriodHours: lockHours
      });
      
      toast({
        title: "Settings Saved",
        description: "Pricing settings have been updated successfully.",
      });
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
        <CardTitle>Pricing Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
