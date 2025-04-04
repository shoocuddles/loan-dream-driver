
import { createClient } from '@supabase/supabase-js';

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

// PDF and CSV generation functions
export const generateApplicationPDF = async (applicationId: string) => {
  // Placeholder - this would typically use a library like jsPDF
  // or call a server function to generate the PDF
  console.log(`Generating PDF for application ${applicationId}`);
  
  // For now, just pretend we generated a PDF
  return {
    url: `https://example.com/application_${applicationId}.pdf`,
    filename: `application_${applicationId}.pdf`
  };
};

export const generateApplicationsCSV = async (applicationIds: string[]) => {
  // Placeholder - this would typically generate a CSV from application data
  console.log(`Generating CSV for applications: ${applicationIds.join(', ')}`);
  
  // For now, just pretend we generated a CSV
  return {
    url: `https://example.com/applications_export.csv`,
    filename: `applications_export.csv`
  };
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
