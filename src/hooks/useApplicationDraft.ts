
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
      
      // Save to localStorage first (fast)
      localStorage.setItem('applicationDraft', JSON.stringify(formData));
      console.log('📂 Saved application data to localStorage');
      
      // Determine if we're updating or creating
      const isDraftUpdate = !!draftId;
      console.log(`🔄 ${isDraftUpdate ? 'Updating' : 'Creating'} draft in Supabase${isDraftUpdate ? ` (ID: ${draftId})` : ''}`);
      
      // Prepare application data
      const applicationData = {
        ...formData,
        isComplete: false,
        status: 'draft',
        updated_at: new Date().toISOString()
      };
      
      try {
        let result;
        
        // Use Supabase directly instead of abstraction layers
        if (isDraftUpdate && draftId) {
          // Update existing draft
          const { data, error } = await supabase
            .from('applications')
            .update(applicationData)
            .eq('id', draftId)
            .select();
          
          if (error) throw error;
          result = data?.[0];
          console.log('✅ Updated draft in Supabase');
        } else {
          // Create new draft
          const { data, error } = await supabase
            .from('applications')
            .insert({
              ...applicationData,
              created_at: new Date().toISOString()
            })
            .select();
          
          if (error) throw error;
          
          result = data?.[0];
          
          if (result?.id) {
            console.log('🆕 Created new draft in Supabase with ID:', result.id);
            setDraftId(result.id);
            localStorage.setItem('applicationDraftId', result.id);
          }
        }
      } catch (error: any) {
        console.error("❌ Supabase error saving draft:", error);
        console.error(`❌ Error message: ${error.message || 'Unknown error'}`);
        
        // Return true anyway since we saved to localStorage
      }
      
      setIsSavingProgress(false);
      return true;
    } catch (error: any) {
      console.error("❌ Unexpected error saving draft:", error);
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
