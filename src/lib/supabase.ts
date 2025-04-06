import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Re-export the supabase client from the centralized location
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { 
  SystemSettings, 
  Application, 
  ApplicationLock, 
  ApplicationDownload, 
  UserDealer,
  UserProfile 
} from '@/lib/types/supabase';
export { supabase };

// System settings
export const getSystemSettings = async (): Promise<SystemSettings> => {
  // Default settings to use if we can't get from database
  const DEFAULT_SETTINGS: SystemSettings = {
    id: 1,
    standardPrice: 9.99,
    discountedPrice: 4.99,
    lockoutPeriodHours: 24,
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await rpcCall<SystemSettings>('get_system_settings');
        
    if (error) {
      console.error('Error fetching system settings:', error);
      return DEFAULT_SETTINGS;
    }
      
    return data as SystemSettings || DEFAULT_SETTINGS;
  } catch (err) {
    console.error('Error accessing system_settings:', err);
    return DEFAULT_SETTINGS;
  }
};

// Alias the default settings for accessibility elsewhere
export const DEFAULT_SETTINGS: SystemSettings = {
  id: 1,
  standardPrice: 9.99,
  discountedPrice: 4.99,
  lockoutPeriodHours: 24,
  updated_at: new Date().toISOString()
};

// Update system settings
export const updateSystemSettings = async (settings: {
  standardPrice: number;
  discountedPrice: number;
  lockoutPeriodHours: number;
}): Promise<boolean> => {
  try {
    const { error } = await rpcCall('update_system_settings', {
      p_standard_price: settings.standardPrice,
      p_discounted_price: settings.discountedPrice,
      p_lockout_period_hours: settings.lockoutPeriodHours
    });
        
    if (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in updateSystemSettings:', error);
    throw error;
  }
};

// Authentication functions
export const signUpDealer = async (email: string, password: string, name: string, company: string) => {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role: 'dealer',
        company_name: company
      }
    }
  });
  
  if (authError) {
    console.error('Error creating dealer auth account:', authError);
    throw authError;
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
export const submitApplication = async (application: any, isDraft = true) => {
  try {
    let data;
    let error;
    
    console.log(`submitApplication called with isDraft=${isDraft}, application:`, 
      application.id ? `ID: ${application.id}` : 'New application');
    
    const isComplete = !isDraft;
    
    // Map application fields to match our database schema
    const applicationData = {
      ...application,
      // Convert form field names to match database field names
      fullName: application.fullName,
      phoneNumber: application.phoneNumber,
      email: application.email,
      streetAddress: application.streetAddress,
      city: application.city,
      province: application.province,
      postalCode: application.postalCode,
      updated_at: new Date().toISOString(),
      status: isComplete ? 'submitted' : 'draft',
      isComplete: isComplete
    };
    
    try {
      // If application has an ID, it's an update to an existing draft
      if (application.id) {
        console.log('Updating application with ID:', application.id, isComplete ? '(COMPLETE)' : '(draft)');
        const { data: updateData, error: updateError } = await rpcCall('update_application', {
          p_application_id: application.id,
          p_application_data: applicationData
        });
          
        console.log('Update application response:', updateError ? 'ERROR' : 'SUCCESS', updateData);
        data = updateData;
        error = updateError;
      } else {
        // New application
        console.log('Creating new application', isComplete ? '(COMPLETE)' : '(draft)');
        const { data: insertData, error: insertError } = await rpcCall('create_application', {
          p_application_data: {
            ...applicationData,
            created_at: new Date().toISOString(),
          }
        });
          
        console.log('Create application response:', insertError ? 'ERROR' : 'SUCCESS', insertData);
        data = insertData;
        error = insertError;
      }
    } catch (err) {
      console.error('Error with application function:', err);
      throw err;
    }
    
    if (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
    
    const resultData = data && data[0] ? data[0] : null;
    console.log('Application submission result:', resultData ? 'SUCCESS' : 'NULL RESULT', resultData);
    return resultData;
  } catch (error) {
    console.error('Exception in submitApplication:', error);
    throw error;
  }
};

export const getApplications = async (): Promise<Application[]> => {
  try {
    // Handle applications table gracefully if it doesn't exist
    try {
      const { data, error } = await rpcCall<Application[]>('get_all_applications');
        
      if (error) {
        console.error('Error fetching applications:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        console.warn('No applications data or wrong format returned');
        return [];
      }

      // Ensure we return properly formatted Application objects
      const applications: Application[] = data.map((app: any) => ({
        id: app.id || '',
        applicationId: app.id || '', // For compatibility
        created_at: app.created_at || new Date().toISOString(),
        updated_at: app.updated_at || app.created_at || new Date().toISOString(),
        fullName: app.fullName || '',
        email: app.email || '',
        phone: app.phone || '',
        address: app.address || '',
        city: app.city || '',
        province: app.province || 'Ontario',
        postalCode: app.postalCode || '',
        vehicleType: app.vehicleType || '',
        vehicleYear: app.vehicleYear || '',
        vehicleMake: app.vehicleMake || '',
        vehicleModel: app.vehicleModel || '',
        income: app.income || 0,
        employmentStatus: app.employmentStatus || '',
        creditScore: app.creditScore || '',
        status: app.status || 'draft',
        isLocked: app.isLocked || false,
        lockExpiresAt: app.lockExpiresAt,
        lockedBy: app.lockedBy,
        wasLocked: app.wasLocked || false
      }));
      
      return applications;
    } catch (err) {
      console.error('Error accessing applications function:', err);
      return [];
    }
  } catch (error) {
    console.error('Error in getApplications:', error);
    return [];
  }
};

// Alias for getApplications for consistency with other code
export const getAllApplications = getApplications;
export const getApplicationsList = getApplications;

export const getApplicationDetails = async (id: string): Promise<Application | null> => {
  try {
    // Handle applications table gracefully if it doesn't exist
    try {
      const { data, error } = await rpcCall<Application>('get_application_by_id', { 
        p_application_id: id 
      });
        
      if (error) {
        console.error('Error fetching application details:', error);
        return null;
      }
      
      if (!data) return null;
      
      const app = data as any;
      return {
        id: app.id || '',
        applicationId: app.id || '', // For compatibility
        created_at: app.created_at || new Date().toISOString(),
        updated_at: app.updated_at || app.created_at || new Date().toISOString(),
        fullName: app.fullName || '',
        email: app.email || '',
        phone: app.phone || '',
        address: app.address || '',
        city: app.city || '',
        province: app.province || 'Ontario',
        postalCode: app.postalCode || '',
        vehicleType: app.vehicleType || '',
        vehicleYear: app.vehicleYear || '',
        vehicleMake: app.vehicleMake || '',
        vehicleModel: app.vehicleModel || '',
        income: app.income || 0,
        employmentStatus: app.employmentStatus || '',
        creditScore: app.creditScore || '',
        status: app.status || 'draft',
        isLocked: app.isLocked || false,
        lockExpiresAt: app.lockExpiresAt,
        lockedBy: app.lockedBy
      };
    } catch (err) {
      console.error('Error accessing application_by_id function:', err);
      return null;
    }
  } catch (error) {
    console.error('Error in getApplicationDetails:', error);
    return null;
  }
};

export const lockApplication = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    // Handle application_locks table gracefully if it doesn't exist
    try {
      const { error } = await rpcCall('lock_application', {
        p_application_id: applicationId,
        p_dealer_id: dealerId,
        p_hours: DEFAULT_SETTINGS.lockoutPeriodHours
      });
        
      if (error) {
        console.error('Error locking application:', error);
        return false;
      }
    } catch (err) {
      console.error('Error with lock_application function:', err);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in lockApplication:', error);
    return false;
  }
};

export const unlockApplication = async (applicationId: string): Promise<boolean> => {
  try {
    // Use RPC function instead of direct table access
    try {
      const { error } = await rpcCall('unlock_application', {
        p_application_id: applicationId
      });
        
      if (error) {
        console.error('Error unlocking application:', error);
        return false;
      }
    } catch (err) {
      console.error('Error with unlock_application function:', err);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in unlockApplication:', error);
    return false;
  }
};

export const checkApplicationLock = async (applicationId: string): Promise<ApplicationLock | null> => {
  try {
    // Use RPC function instead of direct table access
    try {
      const { data, error } = await rpcCall<ApplicationLock>('check_application_lock', {
        p_application_id: applicationId
      });
        
      if (error) {
        console.error('Error checking application lock:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Map response to ApplicationLock type
      const lockData = data as any;
      return {
        id: lockData.id || '',
        application_id: lockData.application_id || '',
        dealer_id: lockData.dealer_id || '',
        locked_at: lockData.locked_at || '',
        expires_at: lockData.expires_at || '',
        isLocked: true // For compatibility with existing code
      };
    } catch (err) {
      console.error('Error with check_application_lock function:', err);
      return null;
    }
  } catch (error) {
    console.error('Error in checkApplicationLock:', error);
    return null;
  }
};

export const recordDownload = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    // Use RPC function instead of direct table access
    try {
      const { error } = await rpcCall('record_application_download', {
        p_application_id: applicationId,
        p_dealer_id: dealerId
      });
        
      if (error) {
        console.error('Error recording download:', error);
        return false;
      }
    } catch (err) {
      console.error('Error with record_application_download function:', err);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in recordDownload:', error);
    return false;
  }
};

// PDF and CSV generation functions
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
export const getDealers = async (): Promise<UserDealer[]> => {
  try {
    // Try to get from user_profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
      
    if (profilesError) {
      console.error('Error fetching dealer profiles:', profilesError);
      return [];
    }
      
    // Map user_profiles to UserDealer format
    const dealers: UserDealer[] = (profilesData || []).map(profile => ({
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email,
      company: profile.company_name || 'Unknown Company',
      isAdmin: profile.role === 'admin',
      isActive: true, // Default to active
      created_at: profile.created_at,
      // Keep original fields for compatibility
      full_name: profile.full_name,
      company_name: profile.company_name,
      role: profile.role,
      company_id: profile.company_id,
      passwordHash: '' // Required by the type but we don't store it
    }));
      
    return dealers;
  } catch (error) {
    console.error('Error in getDealers:', error);
    return [];
  }
};

// Alias for getDealers for consistency with other code
export const getAllDealers = getDealers;

export const getDealerById = async (id: string): Promise<UserDealer | null> => {
  try {
    // Get from user_profiles
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (profileError) {
      console.error('Error fetching dealer profile by ID:', profileError);
      return null;
    }
      
    if (!profileData) return null;
      
    // Map to UserDealer format
    return {
      id: profileData.id,
      email: profileData.email,
      name: profileData.full_name || profileData.email,
      company: profileData.company_name || 'Unknown Company',
      isAdmin: profileData.role === 'admin',
      isActive: true, // Default to active
      created_at: profileData.created_at,
      // Keep original fields for compatibility
      full_name: profileData.full_name,
      company_name: profileData.company_name,
      role: profileData.role,
      company_id: profileData.company_id,
      passwordHash: '' // Required by the type but we don't store it
    };
  } catch (error) {
    console.error('Error in getDealerById:', error);
    return null;
  }
};

export const createDealer = async (dealer: any): Promise<UserDealer | null> => {
  try {
    // Create in user_profiles using RPC
    try {
      const { error } = await rpcCall('create_dealer', {
        p_id: dealer.id,
        p_email: dealer.email,
        p_full_name: dealer.name,
        p_company_name: dealer.company,
        p_role: dealer.isAdmin ? 'admin' : 'dealer'
      });

      if (error) {
        console.error('Error creating dealer profile:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error with create_dealer function:', err);
      // Fall back to direct insertion
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: dealer.id,
          email: dealer.email,
          full_name: dealer.name,
          company_name: dealer.company,
          role: dealer.isAdmin ? 'admin' : 'dealer',
          company_id: '11111111-1111-1111-1111-111111111111' // Default company ID
        });

      if (error) {
        console.error('Error creating dealer profile directly:', error);
        throw error;
      }
    }

    return {
      ...dealer,
      full_name: dealer.name,
      company_name: dealer.company,
      role: dealer.isAdmin ? 'admin' : 'dealer',
      company_id: '11111111-1111-1111-1111-111111111111',
      passwordHash: '' // Required by the type but we don't store it
    };
  } catch (error) {
    console.error('Error in createDealer:', error);
    throw error;
  }
};

// Alias for createDealer for consistency with other code
export const addDealer = async (email: string, password: string, name: string, company: string) => {
  return signUpDealer(email, password, name, company);
};

export const updateDealer = async (id: string, updates: any): Promise<UserDealer | null> => {
  try {
    // Map fields to user_profiles schema
    const userProfileUpdates: any = {};
    if (updates.name) userProfileUpdates.full_name = updates.name;
    if (updates.company) userProfileUpdates.company_name = updates.company;
    if (updates.isAdmin !== undefined) userProfileUpdates.role = updates.isAdmin ? 'admin' : 'dealer';

    // Update in user_profiles
    const { data, error } = await supabase
      .from('user_profiles')
      .update(userProfileUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
    
    if (!data || !data[0]) return null;
    
    // Map to UserDealer format
    const profile = data[0];
    return {
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email,
      company: profile.company_name || 'Unknown Company',
      isAdmin: profile.role === 'admin',
      isActive: true, // Default to active
      created_at: profile.created_at,
      // Keep original fields for compatibility
      full_name: profile.full_name,
      company_name: profile.company_name,
      role: profile.role,
      company_id: profile.company_id,
      passwordHash: '' // Required by the type but we don't store it
    };
  } catch (error) {
    console.error('Error in updateDealer:', error);
    throw error;
  }
};

export const deleteDealer = async (id: string): Promise<boolean> => {
  try {
    // Use RPC call to safely delete user
    try {
      const { error } = await rpcCall('delete_user', {
        p_user_id: id
      });

      if (error) {
        console.error('Error deleting user with RPC:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error with delete_user function:', err);
      // Fall back to direct auth API
      const { error } = await supabase.auth.admin.deleteUser(id);
      
      if (error) {
        console.error('Error deleting user with auth API:', error);
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in deleteDealer:', error);
    throw error;
  }
};
