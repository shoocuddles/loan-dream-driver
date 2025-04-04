
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create typed client (optional Database type)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// System settings
export const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();
      
    if (error) {
      console.error('Error fetching system settings:', error);
      // Return default values if we can't get the settings
      return {
        standardPrice: 9.99,
        discountedPrice: 4.99,
        lockoutPeriodHours: 24
      };
    }
    
    return data;
  } catch (error) {
    console.error('Exception in getSystemSettings:', error);
    // Return default values if we can't get the settings
    return {
      standardPrice: 9.99,
      discountedPrice: 4.99,
      lockoutPeriodHours: 24
    };
  }
};

// Default settings for fallback
export const DEFAULT_SETTINGS = {
  standardPrice: 9.99,
  discountedPrice: 4.99,
  lockoutPeriodHours: 24
};

// Update system settings
export const updateSystemSettings = async (settings: {
  standardPrice: number;
  discountedPrice: number;
  lockoutPeriodHours: number;
}) => {
  const { error } = await supabase
    .from('system_settings')
    .update(settings)
    .eq('id', 1);
    
  if (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
  
  return true;
};

// Authentication functions
export const signUpDealer = async (email: string, password: string, name: string, company: string) => {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        company,
        role: 'dealer'
      }
    }
  });
  
  if (authError) {
    console.error('Error creating dealer auth account:', authError);
    throw authError;
  }
  
  // Create dealer record
  if (authData.user) {
    const dealer = {
      id: authData.user.id,
      email: authData.user.email,
      name,
      company,
      isActive: true,
      created_at: new Date().toISOString()
    };
    
    const { error: dealerError } = await supabase
      .from('dealers')
      .insert([dealer]);
      
    if (dealerError) {
      console.error('Error creating dealer record:', dealerError);
      throw dealerError;
    }
  }
  
  return authData;
};

export const signInDealer = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Error signing in dealer:', error);
    throw error;
  }
  
  return data;
};

export const signOutDealer = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out dealer:', error);
    throw error;
  }
  
  return true;
};

// Applications
export const submitApplication = async (application: any) => {
  const { data, error } = await supabase
    .from('applications')
    .insert([application])
    .select();
    
  if (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
  
  return data[0];
};

export const getApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
  
  return data || [];
};

// Alias for getApplications for consistency with other code
export const getAllApplications = getApplications;
export const getApplicationsList = getApplications;

export const getApplicationDetails = async (id: string) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error('Error fetching application details:', error);
    throw error;
  }
  
  return data;
};

export const lockApplication = async (applicationId: string, dealerId: string) => {
  const { error } = await supabase
    .from('application_locks')
    .insert([{
      application_id: applicationId,
      dealer_id: dealerId,
      locked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + DEFAULT_SETTINGS.lockoutPeriodHours * 60 * 60 * 1000).toISOString() 
    }]);
    
  if (error) {
    console.error('Error locking application:', error);
    throw error;
  }
  
  return true;
};

export const unlockApplication = async (applicationId: string) => {
  const { error } = await supabase
    .from('application_locks')
    .delete()
    .eq('application_id', applicationId);
    
  if (error) {
    console.error('Error unlocking application:', error);
    throw error;
  }
  
  return true;
};

export const checkApplicationLock = async (applicationId: string) => {
  const { data, error } = await supabase
    .from('application_locks')
    .select('*')
    .eq('application_id', applicationId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No lock found (single row error)
      return null;
    }
    console.error('Error checking application lock:', error);
    throw error;
  }
  
  return data;
};

export const recordDownload = async (applicationId: string, dealerId: string) => {
  const { error } = await supabase
    .from('application_downloads')
    .insert([{
      application_id: applicationId,
      dealer_id: dealerId,
      downloaded_at: new Date().toISOString()
    }]);
    
  if (error) {
    console.error('Error recording download:', error);
    throw error;
  }
  
  return true;
};

// PDF and CSV generation functions - returning jsPDF instance directly instead of Promise
export const generateApplicationPDF = (application: any, isAdmin = false) => {
  // Create a new jsPDF instance
  const pdf = new jsPDF();
  
  // Add title
  pdf.setFontSize(20);
  pdf.text('Ontario Loans Application Details', 105, 15, { align: 'center' });
  
  // Add application ID
  pdf.setFontSize(12);
  pdf.text(`Application ID: ${application.id || application.applicationId}`, 14, 30);
  
  // Add submission date
  const submissionDate = application.created_at || application.submissionDate;
  pdf.text(`Submission Date: ${new Date(submissionDate).toLocaleDateString()}`, 14, 40);
  
  // Add applicant details
  pdf.setFontSize(16);
  pdf.text('Applicant Information', 14, 55);
  
  pdf.setFontSize(12);
  pdf.text(`Name: ${application.fullName || 'N/A'}`, 14, 65);
  pdf.text(`Email: ${application.email || 'N/A'}`, 14, 75);
  pdf.text(`Phone: ${application.phone || 'N/A'}`, 14, 85);
  pdf.text(`Address: ${application.address || 'N/A'}`, 14, 95);
  pdf.text(`City: ${application.city || 'N/A'}`, 14, 105);
  pdf.text(`Province: ${application.province || 'Ontario'}`, 14, 115);
  pdf.text(`Postal Code: ${application.postalCode || 'N/A'}`, 14, 125);
  
  // Add vehicle details
  pdf.setFontSize(16);
  pdf.text('Vehicle Information', 14, 140);
  
  pdf.setFontSize(12);
  pdf.text(`Vehicle Type: ${application.vehicleType || 'N/A'}`, 14, 150);
  pdf.text(`Vehicle Year: ${application.vehicleYear || 'N/A'}`, 14, 160);
  pdf.text(`Vehicle Make: ${application.vehicleMake || 'N/A'}`, 14, 170);
  pdf.text(`Vehicle Model: ${application.vehicleModel || 'N/A'}`, 14, 180);
  
  // Add financial details
  pdf.setFontSize(16);
  pdf.text('Financial Information', 14, 195);
  
  pdf.setFontSize(12);
  pdf.text(`Income: $${application.income ? application.income.toLocaleString() : 'N/A'}`, 14, 205);
  pdf.text(`Employment Status: ${application.employmentStatus || 'N/A'}`, 14, 215);
  pdf.text(`Credit Score Range: ${application.creditScore || 'N/A'}`, 14, 225);
  
  // Add footer with powered by text
  pdf.setFontSize(10);
  const footerText = isAdmin ? 'ADMIN COPY - Ontario Loans Application System' : 'Powered by Ontario Loans Application System';
  pdf.text(footerText, 105, 285, { align: 'center' });
  
  return pdf;
};

export const generateApplicationsCSV = (applications: any[]) => {
  // Create headers
  const headers = [
    'Application ID',
    'Submission Date',
    'Full Name',
    'Email',
    'Phone',
    'Address',
    'City',
    'Province',
    'Postal Code',
    'Vehicle Type',
    'Vehicle Year',
    'Vehicle Make',
    'Vehicle Model',
    'Income',
    'Employment Status',
    'Credit Score'
  ].join(',');
  
  // Create rows
  const rows = applications.map(app => [
    app.id || app.applicationId || '',
    app.created_at || app.submissionDate ? new Date(app.created_at || app.submissionDate).toLocaleDateString() : '',
    app.fullName || '',
    app.email || '',
    app.phone || '',
    app.address || '',
    app.city || '',
    app.province || 'Ontario',
    app.postalCode || '',
    app.vehicleType || '',
    app.vehicleYear || '',
    app.vehicleMake || '',
    app.vehicleModel || '',
    app.income ? app.income.toLocaleString() : '',
    app.employmentStatus || '',
    app.creditScore || ''
  ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  
  // Combine headers and rows
  return `${headers}\n${rows.join('\n')}`;
};

// Dealers
export const getDealers = async () => {
    const { data, error } = await supabase
        .from('dealers')
        .select('*');

    if (error) {
        console.error('Error fetching dealers:', error);
        return [];
    }

    return data || [];
};

// Alias for getDealers for consistency with other code
export const getAllDealers = getDealers;

export const getDealerById = async (id: string) => {
    const { data, error } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching dealer by ID:', error);
        return null;
    }

    return data || null;
};

export const createDealer = async (dealer: any) => {
    const { data, error } = await supabase
        .from('dealers')
        .insert([dealer])
        .select();

    if (error) {
        console.error('Error creating dealer:', error);
        throw error;
    }

    return data ? data[0] : null;
};

// Alias for createDealer for consistency with other code
export const addDealer = async (email: string, password: string, name: string, company: string) => {
  return signUpDealer(email, password, name, company);
};

export const updateDealer = async (id: string, updates: any) => {
    const { data, error } = await supabase
        .from('dealers')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error updating dealer:', error);
        throw error;
    }

    return data ? data[0] : null;
};

export const deleteDealer = async (id: string) => {
    const { error } = await supabase
        .from('dealers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting dealer:', error);
        throw error;
    }

    return true;
};
