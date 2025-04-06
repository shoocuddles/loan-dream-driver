
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ApplicationForm } from "@/lib/types";

// Re-export the supabase client from the centralized location
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { submitApplicationToSupabase } from '@/lib/applicationService';
import { 
  SystemSettings, 
  Application, 
  UserDealer,
} from './types/supabase';

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

/**
 * Generate PDF for an application using jsPDF
 */
export const generateApplicationPDF = (application: Application): Blob => {
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
  doc.text(`Full Name: ${application.fullname}`, 14, 35);
  doc.text(`Phone: ${application.phonenumber}`, 14, 42);
  doc.text(`Email: ${application.email}`, 14, 49);
  doc.text(`Address: ${application.streetaddress}, ${application.city}, ${application.province}, ${application.postalcode}`, 14, 56);
  
  // Vehicle Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Information', 14, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vehicle Type: ${application.vehicletype}`, 14, 80);
  if (application.preferredmakemodel) {
    doc.text(`Preferred Make/Model: ${application.preferredmakemodel}`, 14, 87);
  }
  if (application.requiredfeatures) {
    doc.text(`Required Features: ${application.requiredfeatures}`, 14, 94);
  }
  
  // Financial Info Section
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Information', 14, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employment Status: ${application.employmentstatus}`, 14, 120);
  doc.text(`Monthly Income: $${application.monthlyincome}`, 14, 127);
  
  if (application.hasexistingloan) {
    doc.text(`Current Vehicle: ${application.currentvehicle || 'N/A'}`, 14, 134);
    doc.text(`Current Payment: $${application.currentpayment || 'N/A'}`, 14, 141);
    doc.text(`Amount Owed: $${application.amountowed || 'N/A'}`, 14, 148);
    doc.text(`Mileage: ${application.mileage || 'N/A'} km`, 14, 155);
  }
  
  if (application.additionalnotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes', 14, 165);
    doc.setFont('helvetica', 'normal');
    const notes = doc.splitTextToSize(application.additionalnotes, 180);
    doc.text(notes, 14, 172);
  }
  
  // Add timestamp and ID
  doc.setFontSize(8);
  doc.text(`Application ID: ${application.id}`, 14, 285);
  doc.text(`Created: ${new Date(application.created_at || '').toLocaleString()}`, 14, 290);
  
  return doc.output('blob');
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
