
import { useState, useEffect } from "react";
import { ApplicationForm } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to handle application draft functionality
 * Separate from useApplicationForm to avoid having one giant file
 */
export const useApplicationDraft = (initialData: ApplicationForm) => {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  // Load saved draft data on initial load
  useEffect(() => {
    const savedDraft = localStorage.getItem('applicationDraft');
    const savedDraftId = localStorage.getItem('applicationDraftId');
    
    if (savedDraft) {
      try {
        console.log("📋 Found saved draft in localStorage");
        console.log("📋 Draft data:", JSON.parse(savedDraft));
      } catch (err) {
        console.error("❌ Error parsing saved draft:", err);
      }
    }
    
    if (savedDraftId) {
      setDraftId(savedDraftId);
      console.log("🔑 Loaded draft ID:", savedDraftId);
    }
  }, []);

  /**
   * Save progress to localStorage and Supabase
   */
  const saveDraft = async (formData: ApplicationForm): Promise<boolean> => {
    try {
      setIsSavingProgress(true);
      console.log("Beginning draft save process");
      
      // Save to localStorage first (fast)
      localStorage.setItem('applicationDraft', JSON.stringify(formData));
      console.log('📂 Saved application data to localStorage');
      
      // Determine if we're updating or creating
      const isDraftUpdate = !!draftId;
      console.log(`🔄 ${isDraftUpdate ? 'Updating' : 'Creating'} draft in Supabase${isDraftUpdate ? ` (ID: ${draftId})` : ''}`);
      
      // Map application data from our model to database schema
      const applicationData = {
        // Map camelCase to lowercase field names to match database schema
        fullname: formData.fullName,
        phonenumber: formData.phoneNumber,
        email: formData.email,
        streetaddress: formData.streetAddress,
        city: formData.city,
        province: formData.province,
        postalcode: formData.postalCode,
        vehicletype: formData.vehicleType,
        requiredfeatures: formData.requiredFeatures,
        unwantedcolors: formData.unwantedColors,
        preferredmakemodel: formData.preferredMakeModel,
        hasexistingloan: formData.hasExistingLoan,
        currentpayment: formData.currentPayment,
        amountowed: formData.amountOwed,
        currentvehicle: formData.currentVehicle,
        mileage: formData.mileage,
        employmentstatus: formData.employmentStatus,
        monthlyincome: formData.monthlyIncome,
        additionalnotes: formData.additionalNotes,
        status: 'draft',
        iscomplete: false,
        updated_at: new Date().toISOString()
      };
      
      console.log("🔄 Mapped draft data for database:", applicationData);
      
      try {
        let result;
        
        // Use Supabase directly 
        if (isDraftUpdate && draftId) {
          // Update existing draft
          console.log(`🔄 Sending UPDATE request to Supabase for draft ID: ${draftId}`);
          const { data, error } = await supabase
            .from('applications')
            .update(applicationData)
            .eq('id', draftId)
            .select();
          
          if (error) {
            console.error("❌ Supabase error updating draft:", error);
            console.error("❌ Error details:", error.details);
            console.error("❌ Error code:", error.code);
            throw error;
          }
          
          result = data?.[0];
          console.log('✅ Updated draft in Supabase:', result);
        } else {
          // Create new draft
          console.log('🆕 Sending INSERT request to Supabase for new draft');
          const { data, error } = await supabase
            .from('applications')
            .insert({
              ...applicationData,
              created_at: new Date().toISOString()
            })
            .select();
          
          if (error) {
            console.error("❌ Supabase error creating draft:", error);
            console.error("❌ Error details:", error.details);
            console.error("❌ Error code:", error.code);
            throw error;
          }
          
          result = data?.[0];
          
          if (result?.id) {
            console.log('🆕 Created new draft in Supabase with ID:', result.id);
            console.log('🆕 Full result:', result);
            setDraftId(result.id);
            localStorage.setItem('applicationDraftId', result.id);
          }
        }
        
        setIsSavingProgress(false);
        return true;
      } catch (error: any) {
        console.error("❌ Supabase error saving draft:", error);
        console.error(`❌ Error message: ${error.message || 'Unknown error'}`);
        
        // Additional error detail logging
        if (error.details) {
          console.error("❌ Error details:", error.details);
        }
        
        setIsSavingProgress(false);
        return false;
      }
    } catch (error: any) {
      console.error("❌ Unexpected error saving draft:", error);
      console.error("❌ Error stack:", error.stack);
      setIsSavingProgress(false);
      return false;
    }
  };

  /**
   * Clear draft data from localStorage and state
   */
  const clearDraft = () => {
    localStorage.removeItem('applicationDraft');
    localStorage.removeItem('applicationDraftId');
    setDraftId(null);
    console.log("🗑️ Cleared application draft data");
  };

  return {
    draftId,
    isSavingProgress,
    saveDraft,
    clearDraft
  };
};
