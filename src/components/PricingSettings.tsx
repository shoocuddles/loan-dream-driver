
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getSystemSettings, updateSystemSettings, DEFAULT_SETTINGS } from "@/lib/supabase";
import { SystemSettings } from "@/lib/types";

const PricingSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const systemSettings = await getSystemSettings();
        setSettings(systemSettings);
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: "Error",
          description: "Unable to load system settings.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [toast]);
  
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Validate inputs
      if (settings.standardPrice <= 0) {
        toast({
          title: "Invalid Standard Price",
          description: "Standard price must be greater than zero.",
          variant: "destructive",
        });
        return;
      }
      
      if (settings.discountedPrice <= 0 || settings.discountedPrice >= settings.standardPrice) {
        toast({
          title: "Invalid Discounted Price",
          description: "Discounted price must be greater than zero and less than the standard price.",
          variant: "destructive",
        });
        return;
      }
      
      if (settings.lockoutPeriodHours <= 0) {
        toast({
          title: "Invalid Lockout Period",
          description: "Lockout period must be greater than zero.",
          variant: "destructive",
        });
        return;
      }
      
      // Update settings in database
      await updateSystemSettings(settings);
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Unable to save system settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePriceChange = (field: keyof SystemSettings, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setSettings(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Settings</CardTitle>
        <CardDescription>Configure download pricing and lockout period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-center py-2 text-gray-500">Loading settings...</p>
        ) : (
          <>
            <div>
              <Label htmlFor="standardPrice">Standard Price ($)</Label>
              <Input
                id="standardPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={settings.standardPrice}
                onChange={(e) => handlePriceChange('standardPrice', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Price charged for new application downloads
              </p>
            </div>
            
            <div>
              <Label htmlFor="discountedPrice">Discounted Price ($)</Label>
              <Input
                id="discountedPrice"
                type="number"
                min="0.01"
                step="0.01"
                value={settings.discountedPrice}
                onChange={(e) => handlePriceChange('discountedPrice', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Price charged after lockout period expires
              </p>
            </div>
            
            <div>
              <Label htmlFor="lockoutPeriod">Lockout Period (hours)</Label>
              <Input
                id="lockoutPeriod"
                type="number"
                min="1"
                step="1"
                value={settings.lockoutPeriodHours}
                onChange={(e) => handlePriceChange('lockoutPeriodHours', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Hours an application is locked after being downloaded
              </p>
            </div>
            
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-ontario-blue hover:bg-ontario-blue/90 mt-4"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingSettings;
