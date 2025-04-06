
import { ApplicationForm } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Submits an application directly to Supabase without using Firebase
 */
export const submitApplicationToSupabase = async (application: ApplicationForm, isDraft = true): Promise<any> => {
  try {
    console.log(`📝 Submitting application to Supabase (isDraft=${isDraft})`);
    
    const isComplete = !isDraft;
    
    // Map application fields to match our database schema
    const applicationData = {
      // Map camelCase to lowercase field names to match database schema
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
      status: isComplete ? 'submitted' : 'draft',
      iscomplete: isComplete
    };
    
    console.log('📦 Application data prepared for submission:', 
      isComplete ? 'FINAL SUBMISSION' : 'Draft save');
    
    // Use the Supabase client directly for maximum control
    let result;
    
    if (application.applicationId) {
      // Update existing application
      console.log(`🔄 Updating application with ID: ${application.applicationId}`);
      const { data, error } = await supabase
        .from('applications')
        .update(applicationData)
        .eq('id', application.applicationId)
        .select();
      
      if (error) throw error;
      result = data?.[0];
      console.log('✅ Updated application in Supabase');
    } else {
      // Create new application
      console.log('➕ Creating new application', isComplete ? '(COMPLETE)' : '(draft)');
      const { data, error } = await supabase
        .from('applications')
        .insert({
          ...applicationData,
          created_at: new Date().toISOString(),
        })
        .select();
      
      if (error) {
        console.error('❌ Error creating application in Supabase:', error);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error code:', error.code);
        throw error;
      }
      
      result = data?.[0];
      console.log('✅ Created new application in Supabase with ID:', result?.id);
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
    
    throw error;
  }
};
