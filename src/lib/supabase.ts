
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ApplicationForm } from "@/lib/types";

// Re-export the supabase client from the centralized location
export { supabase, rpcCall } from '@/integrations/supabase/client';
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { submitApplicationToSupabase } from '@/lib/applicationService';
import { 
  SystemSettings, 
  Application, 
  UserDealer,
  ApplicationLock,
} from './types/supabase';
import { Database } from './types/supabase-types';
import { safeUserProfile, safeParam } from './typeUtils';

// Define default system settings
export const DEFAULT_SETTINGS = {
  standardPrice: 19.99,
  discountedPrice: 9.99,
  lockoutPeriodHours: 24
};

/**
 * Authentication functions - dealer/admin specific
 */
export const signOutDealer = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error signing out:", error.message);
    return false;
  }
};

/**
 * Dealer management functions
 */
export const getAllDealers = async (): Promise<UserDealer[]> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', safeParam('dealer'));
    
    if (error) throw error;
    
    if (!data || !Array.isArray(data)) return [];
    
    // Use safe mapping for profiles to dealer type
    return data.map(profile => {
      // Check that the required properties exist before accessing them
      if (!profile) return null;
      
      return {
        id: profile.id || '',
        email: profile.email || '',
        name: profile.full_name || '',
        company: profile.company_name || '',
        isActive: true,
        isAdmin: profile.role === 'admin',
        passwordHash: '',
        created_at: profile.created_at || new Date().toISOString()
      };
    }).filter(Boolean) as UserDealer[]; // Filter out any nulls
  } catch (error: any) {
    console.error("Error fetching dealers:", error.message);
    return [];
  }
};

export const addDealer = async (dealer: Partial<UserDealer>): Promise<boolean> => {
  try {
    console.log("Adding dealer:", dealer);
    return true;
  } catch (error: any) {
    console.error("Error adding dealer:", error.message);
    return false;
  }
};

export const updateDealer = async (dealer: Partial<UserDealer>): Promise<UserDealer | null> => {
  try {
    console.log("Updating dealer:", dealer);
    if (dealer.id) {
      return {
        id: dealer.id,
        email: dealer.email || 'email@example.com',
        name: dealer.name || 'Unknown Name',
        company: dealer.company || 'Unknown Company',
        isActive: true,
        isAdmin: dealer.isAdmin || false,
        passwordHash: '',
        created_at: new Date().toISOString()
      };
    }
    return null;
  } catch (error: any) {
    console.error("Error updating dealer:", error.message);
    return null;
  }
};

export const deleteDealer = async (dealerId: string): Promise<boolean> => {
  try {
    console.log("Deleting dealer:", dealerId);
    return true;
  } catch (error: any) {
    console.error("Error deleting dealer:", error.message);
    return false;
  }
};

/**
 * Submits an application to Supabase using our centralized applicationService
 */
export const submitApplication = async (application: ApplicationForm, isDraft = true): Promise<any> => {
  console.log(`📝 submitApplication called with isDraft=${isDraft}, application:`, application);
  console.log(`📝 Application status: ${isDraft ? 'Draft save' : 'FINAL SUBMISSION'}`);
  
  try {
    const result = await submitApplicationToSupabase(application, isDraft);
    console.log(`✅ submitApplication success:`, result);
    return result;
  } catch (error: any) {
    console.error(`❌ Error in submitApplication: ${error.message || 'Unknown error'}`);
    console.error(`❌ Stack trace:`, error.stack);
    throw error;
  }
};

/**
 * Get all applications from Supabase
 */
export const getAllApplications = async (): Promise<Application[]> => {
  try {
    console.log("🔍 Fetching all applications from Supabase");
    const { data, error } = await rpcCall<Application[]>('get_all_applications');
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("❌ Error fetching applications:", error.message);
    return [];
  }
};

// Alias for compatibility with existing code
export const getApplications = getAllApplications;

/**
 * Get application by ID from Supabase
 */
export const getApplicationById = async (id: string): Promise<Application | null> => {
  try {
    console.log(`🔍 Fetching application with ID: ${id}`);
    const { data, error } = await rpcCall<Application>('get_application_by_id', { p_application_id: id });
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error(`❌ Error fetching application ${id}:`, error.message);
    return null;
  }
};

// Alias for getApplicationById for compatibility
export const getApplicationDetails = getApplicationById;

/**
 * Generate PDF for an application using jsPDF
 */
export const generateApplicationPDF = (application: Application, isAdmin = false): Blob => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text('Auto Financing Application', 105, 15, { align: 'center' });
  
  // Add application details
  doc.setFontSize(12);
  
  // Personal Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Personal Information', 14, 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`Full Name: ${application.fullName || application.fullname || ''}`, 14, 35);
  doc.text(`Phone: ${application.phoneNumber || application.phonenumber || application.phone || ''}`, 14, 42);
  doc.text(`Email: ${application.email || ''}`, 14, 49);
  
  // Use proper property names based on the Application type
  const streetAddress = application.streetAddress || application.streetaddress || application.address || '';
  const addressStr = [
    streetAddress,
    application.city || '',
    application.province || '',
    application.postalCode || application.postalcode || ''
  ].filter(Boolean).join(", ");
  
  doc.text(`Address: ${addressStr}`, 14, 56);
  
  // Vehicle Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Information', 14, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle Type: ${application.vehicleType || application.vehicletype || ''}`, 14, 80);
  
  // For compatibility, handle different property names
  const preferredMakeModel = application.preferredMakeModel || application.preferredmakemodel || '';
  if (preferredMakeModel) {
    doc.text(`Preferred Make/Model: ${preferredMakeModel}`, 14, 87);
  }
  
  // For compatibility, handle different property names
  const requiredFeatures = application.requiredFeatures || application.requiredfeatures || '';
  if (requiredFeatures) {
    doc.text(`Required Features: ${requiredFeatures}`, 14, 94);
  }
  
  // Financial Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Information', 14, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employment Status: ${application.employmentStatus || application.employmentstatus || ''}`, 14, 120);
  doc.text(`Monthly Income: $${application.monthlyIncome || application.income || ''}`, 14, 127);
  
  // For compatibility, handle different property names
  const hasExistingLoan = application.hasExistingLoan || application.hasexistingloan || false;
  if (hasExistingLoan) {
    doc.text(`Current Vehicle: ${application.currentVehicle || application.currentvehicle || 'N/A'}`, 14, 134);
    doc.text(`Current Payment: $${application.currentPayment || application.currentpayment || 'N/A'}`, 14, 141);
    doc.text(`Amount Owed: $${application.amountOwed || application.amountowed || 'N/A'}`, 14, 148);
    doc.text(`Mileage: ${application.mileage || 'N/A'} km`, 14, 155);
  }
  
  // For compatibility, handle different property names
  const additionalNotes = application.additionalNotes || application.additionalnotes || '';
  if (additionalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes', 14, 165);
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(additionalNotes, 180);
    doc.text(notes, 14, 172);
  }
  
  // Add timestamp and ID
  doc.setFontSize(8);
  doc.text(`Application ID: ${application.id}`, 14, 285);
  
  const createdAt = application.created_at || '';
  doc.text(`Created: ${new Date(createdAt).toLocaleString()}`, 14, 290);
  
  return doc.output('blob');
};

/**
 * Application lock/unlock functions
 */
export const lockApplication = async (applicationId: string, dealerId: string, lockType = '24hours'): Promise<{success: boolean; message?: string}> => {
  try {
    console.log(`🔒 Locking application ${applicationId} for dealer ${dealerId} with lock type ${lockType}`);
    
    const { data, error } = await rpcCall<{success: boolean; message?: string}>(
      'lock_application',
      {
        p_application_id: applicationId,
        p_dealer_id: dealerId,
        p_lock_type: lockType
      }
    );
    
    if (error) {
      console.error("Error locking application:", error);
      throw error;
    }
    
    return data || { success: false, message: "Unknown error occurred" };
  } catch (error: any) {
    console.error("Error locking application:", error);
    return { 
      success: false, 
      message: error.message || "Failed to lock application" 
    };
  }
};

export const unlockApplication = async (applicationId: string): Promise<{success: boolean; message?: string}> => {
  try {
    console.log(`🔓 Unlocking application ${applicationId}`);
    
    const { data, error } = await rpcCall<{success: boolean; message?: string}>(
      'unlock_application',
      {
        p_application_id: applicationId,
        p_dealer_id: 'admin' // Use 'admin' as dealer ID for admin unlocks
      }
    );
    
    if (error) {
      console.error("Error unlocking application:", error);
      throw error;
    }
    
    return data || { success: false, message: "Unknown error occurred" };
  } catch (error: any) {
    console.error("Error unlocking application:", error);
    return { 
      success: false, 
      message: error.message || "Failed to unlock application" 
    };
  }
};

export const checkApplicationLock = async (applicationId: string): Promise<ApplicationLock | null> => {
  try {
    console.log(`🔍 Checking lock status for application ${applicationId}`);
    return null;
  } catch (error: any) {
    console.error("Error checking application lock:", error.message);
    return null;
  }
};

/**
 * Download and payment functions
 */
export const recordDownload = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`📥 Recording download of application ${applicationId} by dealer ${dealerId}`);
    return true;
  } catch (error: any) {
    console.error("Error recording download:", error.message);
    return false;
  }
};

/**
 * System settings functions
 */
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    console.log("🔍 Fetching system settings");
    
    // Get system settings from Supabase
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error) {
      console.error("Error fetching system settings:", error);
      throw error;
    }
    
    // Map database field names to our local naming convention
    const settings = {
      id: data.id,
      standardPrice: data.standard_price,
      discountedPrice: data.discounted_price,
      lockoutPeriodHours: data.temporary_lock_minutes / 60,
      updated_at: data.updated_at
    };
    
    console.log("Loaded system settings:", settings);
    return settings;
  } catch (error: any) {
    console.error("Error fetching system settings:", error);
    // Fall back to default settings
    return {
      id: 1,
      standardPrice: DEFAULT_SETTINGS.standardPrice,
      discountedPrice: DEFAULT_SETTINGS.discountedPrice,
      lockoutPeriodHours: DEFAULT_SETTINGS.lockoutPeriodHours,
      updated_at: new Date().toISOString()
    };
  }
};

export const updateSystemSettings = async (settings: Partial<SystemSettings>): Promise<boolean> => {
  try {
    console.log("⚙️ Updating system settings:", settings);
    
    // Convert lockoutPeriodHours to minutes for the database
    const dbSettings: any = {};
    
    if (settings.standardPrice !== undefined) {
      dbSettings.standard_price = settings.standardPrice;
    }
    
    if (settings.discountedPrice !== undefined) {
      dbSettings.discounted_price = settings.discountedPrice;
    }
    
    if (settings.lockoutPeriodHours !== undefined) {
      dbSettings.temporary_lock_minutes = settings.lockoutPeriodHours * 60;
    }
    
    console.log("Database settings to update:", dbSettings);
    
    // Update system settings in Supabase
    const { data, error } = await supabase
      .from('system_settings')
      .update(dbSettings)
      .eq('id', 1)
      .select();
    
    if (error) {
      console.error("Error updating system settings:", error);
      throw error;
    }
    
    console.log("System settings updated successfully:", data);
    return true;
  } catch (error: any) {
    console.error("Error updating system settings:", error);
    return false;
  }
};

/**
 * Diagnostic function to check if Supabase is connected
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("🔍 Testing Supabase connection...");
    const { error } = await supabase.from('applications').select('id').limit(1);
    
    if (error) {
      console.error("❌ Supabase connection test failed:", error.message);
      return false;
    }
    
    console.log("✅ Supabase connection test successful");
    return true;
  } catch (error: any) {
    console.error("❌ Supabase connection exception:", error.message);
    return false;
  }
};

// Add dealer pausing/resuming functions to the bottom of the file
export const pauseDealer = async (
  dealerId: string,
  isPermanent: boolean,
  pinCode: string
): Promise<{success: boolean; message?: string}> => {
  try {
    console.log(`Pausing dealer ${dealerId}`, {isPermanent, pinCode});
    
    const { data, error } = await rpcCall<{success: boolean; message?: string}>(
      'pause_dealer',
      {
        p_dealer_id: dealerId,
        p_is_permanent: isPermanent,
        p_pin_code: pinCode
      }
    );
    
    if (error) {
      console.error("Error pausing dealer:", error);
      throw error;
    }
    
    return data || { success: false, message: "Unknown error occurred" };
  } catch (error: any) {
    console.error("Error pausing dealer:", error);
    return { 
      success: false, 
      message: error.message || "Failed to pause dealer" 
    };
  }
};

export const resumeDealerByAdmin = async (
  dealerId: string
): Promise<{success: boolean; message?: string}> => {
  try {
    console.log(`Admin resuming dealer ${dealerId}`);
    
    const { data, error } = await rpcCall<{success: boolean; message?: string}>(
      'resume_dealer_by_admin',
      {
        p_dealer_id: dealerId
      }
    );
    
    if (error) {
      console.error("Error resuming dealer:", error);
      throw error;
    }
    
    return data || { success: false, message: "Unknown error occurred" };
  } catch (error: any) {
    console.error("Error resuming dealer:", error);
    return { 
      success: false, 
      message: error.message || "Failed to resume dealer" 
    };
  }
};

export const resumeDealerWithPin = async (
  dealerId: string,
  pinCode: string
): Promise<{success: boolean; message?: string}> => {
  try {
    console.log(`Resuming dealer ${dealerId} with PIN`);
    
    const { data, error } = await rpcCall<{success: boolean; message?: string}>(
      'resume_dealer_with_pin',
      {
        p_dealer_id: dealerId,
        p_pin_code: pinCode
      }
    );
    
    if (error) {
      console.error("Error resuming dealer with PIN:", error);
      throw error;
    }
    
    return data || { success: false, message: "Unknown error occurred" };
  } catch (error: any) {
    console.error("Error resuming dealer with PIN:", error);
    return { 
      success: false, 
      message: error.message || "Failed to resume dealer with PIN" 
    };
  }
};

export const sendDealerPinEmail = async (
  dealerId: string
): Promise<{success: boolean; message?: string}> => {
  try {
    console.log(`Sending PIN email to dealer ${dealerId}`);
    
    const { data, error } = await rpcCall<{success: boolean; message?: string; pin?: string; email?: string}>(
      'send_dealer_pin_email',
      {
        p_dealer_id: dealerId
      }
    );
    
    if (error) {
      console.error("Error sending PIN email:", error);
      throw error;
    }
    
    // In a real implementation, the pin would be sent via email and not returned
    // For testing purposes, we log the PIN
    if (data?.pin) {
      console.log(`PIN for dealer ${dealerId}: ${data.pin} would be sent to ${data.email}`);
    }
    
    return { 
      success: data?.success || false, 
      message: data?.message || "Unknown error occurred" 
    };
  } catch (error: any) {
    console.error("Error sending PIN email:", error);
    return { 
      success: false, 
      message: error.message || "Failed to send PIN email" 
    };
  }
};

export const isDealerPaused = async (
  dealerId: string
): Promise<{isPaused: boolean; isPermanent?: boolean; pauseId?: string; pausedAt?: string}> => {
  try {
    console.log(`Checking if dealer ${dealerId} is paused`);
    
    const { data, error } = await rpcCall<{
      isPaused: boolean; 
      isPermanent?: boolean; 
      pauseId?: string; 
      pausedAt?: string;
    }>(
      'is_dealer_paused',
      {
        p_dealer_id: dealerId
      }
    );
    
    if (error) {
      console.error("Error checking if dealer is paused:", error);
      throw error;
    }
    
    return data || { isPaused: false };
  } catch (error: any) {
    console.error("Error checking if dealer is paused:", error);
    return { isPaused: false };
  }
};

export const getDefaultPin = async (
  dealerId: string
): Promise<string> => {
  try {
    console.log(`Getting default PIN for dealer ${dealerId}`);
    
    const { data, error } = await rpcCall<string>(
      'get_default_pin',
      {
        p_dealer_id: dealerId
      }
    );
    
    if (error) {
      console.error("Error getting default PIN:", error);
      throw error;
    }
    
    return data || '0000';
  } catch (error: any) {
    console.error("Error getting default PIN:", error);
    return '0000';
  }
};
