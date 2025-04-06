import { ApplicationForm } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/lib/types/supabase-types";
import { 
  mapFormToDbSchema, 
  getSafeInsertValue, 
  getSafeUpdateValue, 
  getSafeParamValue,
  isSupabaseError
} from "./applicationUtils";

type ApplicationInsertData = Database['public']['Tables']['applications']['Insert'];
type ApplicationUpdateData = Database['public']['Tables']['applications']['Update'];

/**
 * Maps ApplicationForm to database schema format
 * Using the utility function for typesafe mapping
 */
const mapApplicationToDbFormat = (application: ApplicationForm, isDraft = true): any => {
  return mapFormToDbSchema(application, isDraft);
};

// Store application data for offline recovery
const storeForOfflineRecovery = (application: ApplicationForm, isDraft: boolean): void => {
  try {
    const offlineStorage = {
      application,
      isDraft,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    // Store in localStorage for recovery
    localStorage.setItem('offlineApplicationSubmission', JSON.stringify(offlineStorage));
    console.log('📱 Application stored for offline recovery');
  } catch (error) {
    console.error('❌ Error storing application for offline recovery:', error);
  }
};

// Check if there's an offline submission to recover
export const checkForOfflineSubmission = (): boolean => {
  return localStorage.getItem('offlineApplicationSubmission') !== null;
};

// Try to submit any offline applications
export const recoverOfflineSubmission = async (): Promise<boolean> => {
  try {
    const offlineData = localStorage.getItem('offlineApplicationSubmission');
    if (!offlineData) return false;
    
    const parsedData = JSON.parse(offlineData);
    console.log('🔄 Found offline application submission, attempting recovery');
    
    // Update retry count
    parsedData.retryCount++;
    localStorage.setItem('offlineApplicationSubmission', JSON.stringify(parsedData));
    
    // If retry count exceeds 5, don't automatically retry anymore
    if (parsedData.retryCount > 5) {
      console.log('⚠️ Max retry count exceeded for offline submission');
      return false;
    }
    
    const result = await submitApplicationToSupabase(parsedData.application, parsedData.isDraft);
    if (result) {
      // Success - remove from offline storage
      localStorage.removeItem('offlineApplicationSubmission');
      console.log('✅ Successfully recovered offline submission');
      toast.success('Your previously saved application has been submitted successfully!');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error recovering offline submission:', error);
    return false;
  }
};

/**
 * Submits an application directly to Supabase without using Firebase
 */
export const submitApplicationToSupabase = async (application: ApplicationForm, isDraft = true): Promise<any> => {
  try {
    console.log(`📝 Submitting application to Supabase (isDraft=${isDraft})`);
    
    // Map application fields to match our database schema
    const applicationData = mapApplicationToDbFormat(application, isDraft);
    
    console.log('📦 Application data prepared for submission:', 
      isDraft ? 'Draft save' : 'FINAL SUBMISSION');
    
    // Add retry logic for better reliability
    let retryCount = 0;
    const maxRetries = 3;
    let result;
    
    while (retryCount < maxRetries) {
      try {
        // Force a new connection attempt before sending data with a shorter timeout
        const connectionCheck = await Promise.race([
          supabase.from('applications').select('count').limit(1).single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
        ]);
        
        const checkError = connectionCheck && typeof connectionCheck === 'object' && 'error' in connectionCheck ? 
          connectionCheck.error : null;
        
        console.log(`🔍 Connection check before submission: ${checkError ? 'Failed' : 'Success'}`);
        
        if (checkError) {
          console.warn(`⚠️ Connection issue detected (attempt ${retryCount + 1}/${maxRetries}): ${checkError.message || 'Unknown error'}`);
          
          // If this is the last retry, store for offline recovery
          if (retryCount === maxRetries - 1) {
            storeForOfflineRecovery(application, isDraft);
            toast.error("Connection to database failed. Your application has been saved locally and will be submitted when connection is restored.");
          }
          
          // Wait before retrying with exponential backoff (but shorter times)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          retryCount++;
          continue;
        }
        
        if (application.applicationId) {
          // Update existing application
          console.log(`🔄 Updating application with ID: ${application.applicationId} (Attempt ${retryCount + 1})`);
          
          const { data, error } = await supabase
            .from('applications')
            .update(getSafeUpdateValue(applicationData))
            .eq('id', getSafeParamValue(application.applicationId))
            .select();
          
          if (error) {
            console.error('❌ Supabase update error:', error);
            
            // If this is the last retry, store for offline recovery
            if (retryCount === maxRetries - 1) {
              storeForOfflineRecovery(application, isDraft);
              throw error;
            }
            
            // Otherwise, retry
            retryCount++;
            // Wait before retrying with shorter exponential backoff
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
            continue;
          }
          
          result = data?.[0];
          console.log('✅ Updated application in Supabase:', result);
          
          if (!result) {
            throw new Error(`No data returned after updating application ID: ${application.applicationId}`);
          }
          
          if (isDraft) {
            toast.success("Draft saved successfully");
          } else {
            toast.success("Application submitted successfully!");
          }
          
          // Success, break out of retry loop
          break;
        } else {
          // Create new application
          console.log('➕ Creating new application', isDraft ? '(DRAFT)' : '(COMPLETE)');
          
          // Make sure we're using an array for insert
          const insertData = { ...applicationData, created_at: new Date().toISOString() };
          const { data, error } = await supabase
            .from('applications')
            .insert(getSafeInsertValue([insertData]))
            .select();
          
          if (error) {
            console.error('❌ Error creating application in Supabase:', error);
            
            // If this is the last retry, store for offline recovery
            if (retryCount === maxRetries - 1) {
              storeForOfflineRecovery(application, isDraft);
              toast.error("Connection error. Your application has been saved offline.");
              throw error;
            }
            
            // Otherwise, retry
            retryCount++;
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
            continue;
          }
          
          // Log exact response for debugging
          console.log('✅ Supabase insert response:', data);
          
          result = data?.[0];
          if (result) {
            console.log('✅ Created new application in Supabase with ID:', result.id);
            toast.success(isDraft ? "Draft saved" : "Application submitted successfully!");
          } else {
            console.error('❌ No result received after successful insert');
            storeForOfflineRecovery(application, isDraft);
            throw new Error('No result received from Supabase insert operation');
          }
          
          // Success, break out of retry loop
          break;
        }
      } catch (innerError) {
        console.error(`❌ Error during submission attempt ${retryCount + 1}:`, innerError);
        
        // If this is the last retry, save offline and rethrow
        if (retryCount === maxRetries - 1) {
          storeForOfflineRecovery(application, isDraft);
          throw innerError;
        }
        
        // Otherwise, retry
        retryCount++;
        
        // Wait before retrying (shorter exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('❌ Error in submitApplicationToSupabase:', error);
    
    // Enhanced error logging
    if (isSupabaseError(error)) {
      if ('code' in error) {
        console.error('❌ Error code:', error.code);
      }
      
      if ('message' in error) {
        console.error('❌ Error message:', error.message);
        toast.error(`Submission error: ${error.message}`);
      }
    }
    
    // Save for offline recovery as a last resort
    storeForOfflineRecovery(application, isDraft);
    
    throw error;
  }
};
