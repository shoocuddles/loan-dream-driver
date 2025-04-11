import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchSystemSettings, updateSystemSettings } from "@/lib/services/settings/settingsService";
import { syncPricesToStripe } from "@/lib/services/stripe/stripeService";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface PricingSettingsState {
  standardPrice: string;
  discountedPrice: string;
  temporaryLockMinutes: string;
  isLoading: boolean;
  isSaving: boolean;
  syncingStripe: boolean;
  stripeError: string | null;
  ageDiscountEnabled: boolean;
  ageDiscountThreshold: string;
  ageDiscountPercentage: string;
}

const PricingSettings = () => {
  const [state, setState] = useState<PricingSettingsState>({
    standardPrice: "",
    discountedPrice: "",
    temporaryLockMinutes: "",
    isLoading: true,
    isSaving: false,
    syncingStripe: false,
    stripeError: null,
    ageDiscountEnabled: false,
    ageDiscountThreshold: "30",
    ageDiscountPercentage: "25"
  });
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const settings = await fetchSystemSettings();
      
      if (settings) {
        console.log("Loaded system settings:", settings);
        setState(prev => ({
          ...prev,
          standardPrice: settings.standardPrice.toString(),
          discountedPrice: settings.discountedPrice.toString(),
          temporaryLockMinutes: settings.temporaryLockMinutes.toString(),
          ageDiscountEnabled: settings.ageDiscountEnabled || false,
          ageDiscountThreshold: settings.ageDiscountThreshold?.toString() || "30",
          ageDiscountPercentage: settings.ageDiscountPercentage?.toString() || "25"
        }));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const updateField = (field: keyof PricingSettingsState, value: string | boolean) => {
    setState(prev => ({ ...prev, [field]: value }));
  };
  
  const validateInputs = (): boolean => {
    // Validate standard price
    const standard = parseFloat(state.standardPrice);
    if (isNaN(standard) || standard <= 0) {
      toast({
        title: "Invalid Price",
        description: "Standard price must be a positive number.",
        variant: "destructive",
      });
      return false;
    }
    
    // Validate discounted price
    const discounted = parseFloat(state.discountedPrice);
    if (isNaN(discounted) || discounted <= 0) {
      toast({
        title: "Invalid Price",
        description: "Discounted price must be a positive number.",
        variant: "destructive",
      });
      return false;
    }
    
    // Validate that discounted price is lower than standard price
    if (discounted >= standard) {
      toast({
        title: "Invalid Pricing",
        description: "Discounted price must be lower than the standard price.",
        variant: "destructive",
      });
      return false;
    }
    
    // Validate lockout period
    const lockMinutes = parseInt(state.temporaryLockMinutes);
    if (isNaN(lockMinutes) || lockMinutes <= 0) {
      toast({
        title: "Invalid Lockout Period",
        description: "Lockout period must be a positive number of minutes.",
        variant: "destructive",
      });
      return false;
    }
    
    // Validate age-based discount settings if enabled
    if (state.ageDiscountEnabled) {
      // Validate days threshold
      const daysThreshold = parseInt(state.ageDiscountThreshold);
      if (isNaN(daysThreshold) || daysThreshold <= 0) {
        toast({
          title: "Invalid Age Threshold",
          description: "Age threshold must be a positive number of days.",
          variant: "destructive",
        });
        return false;
      }
      
      // Validate discount percentage
      const discountPercentage = parseInt(state.ageDiscountPercentage);
      if (isNaN(discountPercentage) || discountPercentage <= 0 || discountPercentage >= 100) {
        toast({
          title: "Invalid Discount Percentage",
          description: "Discount percentage must be between 1 and 99.",
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };
  
  const syncWithStripe = async (standardPrice: number, discountedPrice: number) => {
    setState(prev => ({ ...prev, syncingStripe: true, stripeError: null }));
    
    try {
      const result = await syncPricesToStripe(standardPrice, discountedPrice);
      
      if (result.error) {
        setState(prev => ({ 
          ...prev, 
          stripeError: `Failed to sync prices with Stripe: ${result.error.message}` 
        }));
        
        return false;
      }
      
      console.log("Synced prices with Stripe:", result.data);
      return true;
    } catch (error: any) {
      console.error("Error syncing with Stripe:", error);
      setState(prev => ({ 
        ...prev, 
        stripeError: `Error syncing with Stripe: ${error.message}` 
      }));
      return false;
    } finally {
      setState(prev => ({ ...prev, syncingStripe: false }));
    }
  };
  
  const handleSave = async () => {
    if (!validateInputs()) return;
    
    setState(prev => ({ ...prev, isSaving: true }));
    
    try {
      // Extract numerical values
      const standardPrice = parseFloat(state.standardPrice);
      const discountedPrice = parseFloat(state.discountedPrice);
      const temporaryLockMinutes = parseInt(state.temporaryLockMinutes);
      const ageDiscountThreshold = parseInt(state.ageDiscountThreshold);
      const ageDiscountPercentage = parseInt(state.ageDiscountPercentage);
      
      // Log the values being saved for debugging
      console.log("Saving system settings:", {
        standardPrice,
        discountedPrice,
        temporaryLockMinutes,
        ageDiscountEnabled: state.ageDiscountEnabled,
        ageDiscountThreshold,
        ageDiscountPercentage
      });
      
      // First, try to sync with Stripe
      const stripeSuccess = await syncWithStripe(standardPrice, discountedPrice);
      if (!stripeSuccess) {
        toast({
          title: "Stripe Sync Failed",
          description: "Failed to sync prices with Stripe. Please check the error message and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Save settings to Supabase directly instead of using the API
      const result = await updateSystemSettings({
        standardPrice,
        discountedPrice,
        temporaryLockMinutes,
        ageDiscountEnabled: state.ageDiscountEnabled,
        ageDiscountThreshold,
        ageDiscountPercentage
      });
      
      if (!result) {
        throw new Error("Failed to update system settings");
      }
      
      toast({
        title: "Settings Saved",
        description: "Pricing settings have been updated successfully and synced with Stripe.",
      });
      
      // Reload settings to verify
      await loadSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save pricing settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
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
          Changes will automatically sync with Stripe.
        </div>
        
        {state.stripeError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.stripeError}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="standardPrice">Standard Download Price</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
            <Input 
              id="standardPrice"
              value={state.standardPrice}
              onChange={e => updateField('standardPrice', e.target.value)}
              placeholder="e.g. 10.99"
              className="pl-7"
              disabled={state.isLoading}
              type="number"
              step="0.01"
              min="0.01"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="discountedPrice">Discounted Download Price</Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
            <Input 
              id="discountedPrice"
              value={state.discountedPrice}
              onChange={e => updateField('discountedPrice', e.target.value)}
              placeholder="e.g. 5.99"
              className="pl-7"
              disabled={state.isLoading}
              type="number"
              step="0.01"
              min="0.01"
            />
          </div>
          <p className="text-xs text-gray-500">Price after initial lockout period expires</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="temporaryLockMinutes">Temporary Lock Duration (minutes)</Label>
          <Input 
            id="temporaryLockMinutes"
            value={state.temporaryLockMinutes}
            onChange={e => updateField('temporaryLockMinutes', e.target.value)}
            placeholder="e.g. 30"
            disabled={state.isLoading}
            type="number"
            min="1"
          />
          <p className="text-xs text-gray-500">How long applications are locked for other dealers after download</p>
        </div>

        <div className="border-t pt-4 mt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="ageDiscountEnabled" className="font-semibold">Age-Based Discount</Label>
            <Switch
              id="ageDiscountEnabled"
              checked={state.ageDiscountEnabled}
              onCheckedChange={checked => updateField('ageDiscountEnabled', checked)}
              disabled={state.isLoading}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Automatically discount older applications to make them more attractive to dealers
          </p>
          
          {state.ageDiscountEnabled && (
            <div className="space-y-4 pl-2 border-l-2 border-green-200">
              <div className="space-y-2">
                <Label htmlFor="ageDiscountThreshold">Discount applications older than (days)</Label>
                <Input 
                  id="ageDiscountThreshold"
                  value={state.ageDiscountThreshold}
                  onChange={e => updateField('ageDiscountThreshold', e.target.value)}
                  placeholder="e.g. 30"
                  disabled={state.isLoading}
                  type="number"
                  min="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ageDiscountPercentage">Discount percentage (%)</Label>
                <div className="relative">
                  <Input 
                    id="ageDiscountPercentage"
                    value={state.ageDiscountPercentage}
                    onChange={e => updateField('ageDiscountPercentage', e.target.value)}
                    placeholder="e.g. 25"
                    disabled={state.isLoading}
                    type="number"
                    min="1"
                    max="99"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500">Discounted prices will show in green on the dealer dashboard</p>
              </div>
            </div>
          )}
        </div>
        
        <Button 
          className="w-full mt-4 bg-ontario-blue hover:bg-ontario-blue/90" 
          onClick={handleSave}
          disabled={state.isLoading || state.isSaving || state.syncingStripe}
        >
          {state.isSaving || state.syncingStripe ? 
            `${state.syncingStripe ? 'Syncing with Stripe...' : 'Saving...'}` : 
            "Save Settings"
          }
        </Button>
      </CardContent>
    </Card>
  );
};

export default PricingSettings;
