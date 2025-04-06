
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
      .eq('role', 'dealer');
    
    if (error) throw error;
    
    return data?.map(profile => ({
      id: profile.id,
      email: profile.email,
      name: profile.full_name || '',
      company: profile.company_name || '',
      isActive: true,
      isAdmin: profile.role === 'admin',
      passwordHash: '',
      created_at: profile.created_at
    })) || [];
  } catch (error: any) {
    console.error("Error fetching dealers:", error.message);
    return [];
  }
};

export const addDealer = async (dealer: Partial<UserDealer>): Promise<boolean> => {
  try {
    // This would typically involve creating an auth user and profile
    console.log("Adding dealer:", dealer);
    return true;
  } catch (error: any) {
    console.error("Error adding dealer:", error.message);
    return false;
  }
};

export const updateDealer = async (dealer: Partial<UserDealer>): Promise<boolean> => {
  try {
    console.log("Updating dealer:", dealer);
    return true;
  } catch (error: any) {
    console.error("Error updating dealer:", error.message);
    return false;
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
  console.log(`📝 submitApplication called with isDraft=${isDraft}, application: ${isDraft ? 'Draft save' : 'FINAL SUBMISSION'} new application`);
  
  console.log('📦 Application data prepared for submission:', application);
  
  try {
    // Use the submitApplicationToSupabase function from the applicationService
    return await submitApplicationToSupabase(application, isDraft);
  } catch (error: any) {
    console.error(`❌ Error in submitApplication: ${error.message || 'Unknown error'}`);
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
  doc.text(`Full Name: ${application.fullName}`, 14, 35);
  doc.text(`Phone: ${application.phoneNumber || application.phone}`, 14, 42);
  doc.text(`Email: ${application.email}`, 14, 49);
  
  // Use proper property names based on the Application type
  const addressStr = [
    application.streetAddress || application.address,
    application.city,
    application.province,
    application.postalCode
  ].filter(Boolean).join(", ");
  
  doc.text(`Address: ${addressStr}`, 14, 56);
  
  // Vehicle Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Information', 14, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle Type: ${application.vehicleType}`, 14, 80);
  
  // For compatibility, handle different property names
  if (application.preferredMakeModel) {
    doc.text(`Preferred Make/Model: ${application.preferredMakeModel}`, 14, 87);
  }
  
  // For compatibility, handle different property names
  if (application.requiredFeatures) {
    doc.text(`Required Features: ${application.requiredFeatures}`, 14, 94);
  }
  
  // Financial Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Information', 14, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employment Status: ${application.employmentStatus}`, 14, 120);
  doc.text(`Monthly Income: $${application.monthlyIncome || application.income}`, 14, 127);
  
  // For compatibility, handle different property names
  if (application.hasExistingLoan) {
    doc.text(`Current Vehicle: ${application.currentVehicle || 'N/A'}`, 14, 134);
    doc.text(`Current Payment: $${application.currentPayment || 'N/A'}`, 14, 141);
    doc.text(`Amount Owed: $${application.amountOwed || 'N/A'}`, 14, 148);
    doc.text(`Mileage: ${application.mileage || 'N/A'} km`, 14, 155);
  }
  
  // For compatibility, handle different property names
  if (application.additionalNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes', 14, 165);
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(application.additionalNotes, 180);
    doc.text(notes, 14, 172);
  }
  
  // Add timestamp and ID
  doc.setFontSize(8);
  doc.text(`Application ID: ${application.id}`, 14, 285);
  doc.text(`Created: ${new Date(application.created_at || '').toLocaleString()}`, 14, 290);
  
  return doc.output('blob');
};

/**
 * Application lock/unlock functions
 */
export const lockApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`🔒 Locking application ${applicationId} for dealer ${dealerId}`);
    // Implement the lock logic here
    return true;
  } catch (error: any) {
    console.error("Error locking application:", error.message);
    return false;
  }
};

export const unlockApplication = async (applicationId: string): Promise<boolean> => {
  try {
    console.log(`🔓 Unlocking application ${applicationId}`);
    // Implement the unlock logic here
    return true;
  } catch (error: any) {
    console.error("Error unlocking application:", error.message);
    return false;
  }
};

export const checkApplicationLock = async (applicationId: string): Promise<ApplicationLock | null> => {
  try {
    console.log(`🔍 Checking lock status for application ${applicationId}`);
    // Implement the check logic here
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
    // Implement the record download logic here
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
    // In a real implementation, this would fetch from the database
    console.log("🔍 Fetching system settings");
    return {
      id: 1,
      standardPrice: DEFAULT_SETTINGS.standardPrice,
      discountedPrice: DEFAULT_SETTINGS.discountedPrice,
      lockoutPeriodHours: DEFAULT_SETTINGS.lockoutPeriodHours,
      updated_at: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("Error fetching system settings:", error.message);
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
    // Implement the update settings logic here
    return true;
  } catch (error: any) {
    console.error("Error updating system settings:", error.message);
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

