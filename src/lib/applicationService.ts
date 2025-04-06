
import { ApplicationForm } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/lib/types/supabase-types";

type ApplicationInsertData = Database['public']['Tables']['applications']['Insert'];
type ApplicationUpdateData = Database['public']['Tables']['applications']['Update'];

/**
 * Maps ApplicationForm to database schema format
 */
const mapApplicationToDbFormat = (application: ApplicationForm, isDraft = true): ApplicationInsertData => {
  return {
    fullname: application.fullName,
    phonenumber: application.phoneNumber,
    email: application.email,
    streetaddress: application.streetAddress,
    city: application.city,
    province: application.province,
    postalcode: application.postalCode,
    vehicletype: application.vehicleType,
    requiredfeatures: application.requiredFeatures,
    unwantedcolors: application.unwantedColors,
    preferredmakemodel: application.preferredMakeModel,
    hasexistingloan: application.hasExistingLoan,
    currentpayment: application.currentPayment,
    amountowed: application.amountOwed,
    currentvehicle: application.currentVehicle,
    mileage: application.mileage,
    employmentstatus: application.employmentStatus,
    monthlyincome: application.monthlyIncome,
    additionalnotes: application.additionalNotes,
    updated_at: new Date().toISOString(),
    status: isDraft ? 'draft' : 'submitted',
    iscomplete: !isDraft
  };
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
    console.log('📦 Mapped application data:', applicationData);

    // Add retry logic for better reliability
    let retryCount = 0;
    const maxRetries = 3;
    let result;
    
    while (retryCount < maxRetries) {
      try {
        // Force a new connection attempt before sending data
        const connectionCheck = await supabase.from('applications').select('count').limit(1).single();
        console.log(`🔍 Connection check before submission: ${connectionCheck.error ? 'Failed' : 'Success'}`);
        
        if (connectionCheck.error) {
          console.warn(`⚠️ Connection issue detected (attempt ${retryCount + 1}/${maxRetries}): ${connectionCheck.error.message}`);
          
          // If this is the last retry, show a toast notification
          if (retryCount === maxRetries - 1) {
            toast.error("Connection to database failed. Please check your internet connection and try again.");
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          retryCount++;
          continue;
        }
        
        if (application.applicationId) {
          // Update existing application
          console.log(`🔄 Updating application with ID: ${application.applicationId} (Attempt ${retryCount + 1})`);
          
          const { data, error } = await supabase
            .from('applications')
            .update(applicationData as ApplicationUpdateData)
            .eq('id', application.applicationId as string)
            .select();
          
          if (error) {
            console.error('❌ Supabase update error:', error);
            console.error('❌ Error details:', error.details);
            console.error('❌ Error code:', error.code);
            
            // If this is the last retry, throw the error
            if (retryCount === maxRetries - 1) throw error;
            
            // Otherwise, retry
            retryCount++;
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
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
          console.log('➕ Data being sent to Supabase:', applicationData);
          
          // Make sure we're using an array for insert
          const insertData = { ...applicationData, created_at: new Date().toISOString() };
          const { data, error } = await supabase
            .from('applications')
            .insert([insertData])
            .select();
          
          if (error) {
            console.error('❌ Error creating application in Supabase:', error);
            console.error('❌ Error details:', error.details);
            console.error('❌ Error code:', error.code);
            console.error('❌ Data that failed:', applicationData);
            
            // Show toast notification for user feedback
            if (retryCount === maxRetries - 1) {
              toast.error("Connection error. Please try again.");
              throw error;
            }
            
            // Otherwise, retry
            retryCount++;
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            continue;
          }
          
          // Log exact response for debugging
          console.log('✅ Supabase insert response:', data);
          
          result = data?.[0];
          if (result) {
            console.log('✅ Created new application in Supabase with ID:', result.id);
            console.log('✅ Full response:', result);
            toast.success(isDraft ? "Draft saved" : "Application submitted successfully!");
          } else {
            console.error('❌ No result received after successful insert');
            throw new Error('No result received from Supabase insert operation');
          }
          
          // Success, break out of retry loop
          break;
        }
      } catch (innerError) {
        console.error(`❌ Error during submission attempt ${retryCount + 1}:`, innerError);
        
        // If this is the last retry, rethrow
        if (retryCount === maxRetries - 1) throw innerError;
        
        // Otherwise, log and retry
        console.warn(`Retry ${retryCount + 1}/${maxRetries} failed:`, innerError);
        retryCount++;
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('❌ Error in submitApplicationToSupabase:', error);
    
    // Enhanced error logging
    if (error.code) {
      console.error('❌ Error code:', error.code);
    }
    
    if (error.details) {
      console.error('❌ Error details:', error.details);
    }
    
    if (error.message) {
      console.error('❌ Error message:', error.message);
      toast.error(`Submission error: ${error.message}`);
    }
    
    if (error.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    
    throw error;
  }
};
