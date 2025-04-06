import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Re-export the supabase client from the centralized location
import { supabase } from '@/integrations/supabase/client';
import { SystemSettings, Application, ApplicationLock, ApplicationDownload, UserDealer } from '@/lib/types/supabase';
export { supabase };

// System settings
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    // Since system_settings may not be in the database schema, we need to handle this gracefully
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
        
      if (error) {
        console.error('Error fetching system settings:', error);
        // Return default values if we can't get the settings
        return {
          id: 1,
          standardPrice: 9.99,
          discountedPrice: 4.99,
          lockoutPeriodHours: 24,
          updated_at: new Date().toISOString()
        };
      }
      
      return data as SystemSettings;
    } catch (err) {
      console.error('Error accessing system_settings table:', err);
      // Return default values if the table doesn't exist
      return {
        id: 1,
        standardPrice: 9.99,
        discountedPrice: 4.99,
        lockoutPeriodHours: 24,
        updated_at: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Exception in getSystemSettings:', error);
    // Return default values if we can't get the settings
    return {
      id: 1,
      standardPrice: 9.99,
      discountedPrice: 4.99,
      lockoutPeriodHours: 24,
      updated_at: new Date().toISOString()
    };
  }
};

// Default settings for fallback
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
    // Since system_settings may not be in the database schema, we need to handle this gracefully
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          standardPrice: settings.standardPrice,
          discountedPrice: settings.discountedPrice,
          lockoutPeriodHours: settings.lockoutPeriodHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
        
      if (error) {
        console.error('Error updating system settings:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error accessing system_settings table:', err);
      // Silently fail if the table doesn't exist
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
export const submitApplication = async (application: any, isDraft = false) => {
  try {
    let data;
    let error;
    
    // Handle applications table gracefully if it doesn't exist
    try {
      // If application has an ID, it's an update to an existing draft
      if (application.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('applications')
          .update({
            ...application,
            updated_at: new Date().toISOString(),
            status: isDraft ? 'draft' : 'submitted'
          })
          .eq('id', application.id)
          .select();
          
        data = updateData;
        error = updateError;
      } else {
        // New application
        const { data: insertData, error: insertError } = await supabase
          .from('applications')
          .insert([{
            ...application,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: isDraft ? 'draft' : 'submitted'
          }])
          .select();
          
        data = insertData;
        error = insertError;
      }
    } catch (err) {
      console.error('Error accessing applications table:', err);
      return null;
    }
    
    if (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
    
    return data && data[0] ? data[0] : null;
  } catch (error) {
    console.error('Exception in submitApplication:', error);
    throw error;
  }
};

export const getApplications = async (): Promise<Application[]> => {
  try {
    // Handle applications table gracefully if it doesn't exist
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching applications:', error);
        return [];
      }
      
      return data as Application[] || [];
    } catch (err) {
      console.error('Error accessing applications table:', err);
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
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Error fetching application details:', error);
        return null;
      }
      
      return data as Application;
    } catch (err) {
      console.error('Error accessing applications table:', err);
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
        return false;
      }
    } catch (err) {
      console.error('Error accessing application_locks table:', err);
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
    // Handle application_locks table gracefully if it doesn't exist
    try {
      const { error } = await supabase
        .from('application_locks')
        .delete()
        .eq('application_id', applicationId);
        
      if (error) {
        console.error('Error unlocking application:', error);
        return false;
      }
    } catch (err) {
      console.error('Error accessing application_locks table:', err);
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
    // Handle application_locks table gracefully if it doesn't exist
    try {
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
        return null;
      }
      
      return data as ApplicationLock;
    } catch (err) {
      console.error('Error accessing application_locks table:', err);
      return null;
    }
  } catch (error) {
    console.error('Error in checkApplicationLock:', error);
    return null;
  }
};

export const recordDownload = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    // Handle application_downloads table gracefully if it doesn't exist
    try {
      const { error } = await supabase
        .from('application_downloads')
        .insert([{
          application_id: applicationId,
          dealer_id: dealerId,
          downloaded_at: new Date().toISOString()
        }]);
        
      if (error) {
        console.error('Error recording download:', error);
        return false;
      }
    } catch (err) {
      console.error('Error accessing application_downloads table:', err);
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
        // First try to get dealers from the dealers table
        try {
            const { data, error } = await supabase
                .from('dealers')
                .select('*');

            if (!error && data && data.length > 0) {
                return data as UserDealer[];
            }
        } catch (err) {
            console.log('Dealers table not found, trying user_profiles instead:', err);
        }

        // If dealers table doesn't exist or is empty, try getting from user_profiles
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*');

        if (error) {
            console.error('Error fetching user profiles:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getDealers:', error);
        return [];
    }
};

// Alias for getDealers for consistency with other code
export const getAllDealers = getDealers;

export const getDealerById = async (id: string): Promise<UserDealer | null> => {
    try {
        // First try to get from dealers table
        try {
            const { data, error } = await supabase
                .from('dealers')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                return data as UserDealer;
            }
        } catch (err) {
            console.log('Dealers table not found, trying user_profiles instead:', err);
        }

        // If dealers table doesn't exist or record not found, try user_profiles
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching dealer by ID:', error);
            return null;
        }

        return data || null;
    } catch (error) {
        console.error('Error in getDealerById:', error);
        return null;
    }
};

export const createDealer = async (dealer: any): Promise<UserDealer | null> => {
    try {
        // Try to create in dealers table first
        try {
            const { data, error } = await supabase
                .from('dealers')
                .insert([dealer])
                .select();

            if (!error && data && data.length > 0) {
                return data[0] as UserDealer;
            }
        } catch (err) {
            console.log('Dealers table not found, trying user_profiles instead:', err);
        }

        // If dealers table doesn't exist, try creating in user_profiles
        const { data, error } = await supabase
            .from('user_profiles')
            .insert([{
                id: dealer.id,
                email: dealer.email,
                full_name: dealer.name,
                company_name: dealer.company,
                role: dealer.isAdmin ? 'admin' : 'dealer',
                company_id: '11111111-1111-1111-1111-111111111111' // Default company ID
            }])
            .select();

        if (error) {
            console.error('Error creating dealer profile:', error);
            throw error;
        }

        return data && data.length > 0 ? data[0] as unknown as UserDealer : null;
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
        // Try to update in dealers table first
        try {
            const { data, error } = await supabase
                .from('dealers')
                .update(updates)
                .eq('id', id)
                .select();

            if (!error && data && data.length > 0) {
                return data[0] as UserDealer;
            }
        } catch (err) {
            console.log('Dealers table not found, trying user_profiles instead:', err);
        }

        // Map fields to user_profiles schema
        const userProfileUpdates: any = {};
        if (updates.name) userProfileUpdates.full_name = updates.name;
        if (updates.company) userProfileUpdates.company_name = updates.company;
        if (updates.isAdmin !== undefined) userProfileUpdates.role = updates.isAdmin ? 'admin' : 'dealer';

        // If dealers table doesn't exist, try updating in user_profiles
        const { data, error } = await supabase
            .from('user_profiles')
            .update(userProfileUpdates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }

        return data && data.length > 0 ? data[0] as unknown as UserDealer : null;
    } catch (error) {
        console.error('Error in updateDealer:', error);
        throw error;
    }
};

export const deleteDealer = async (id: string): Promise<boolean> => {
    try {
        // Try to delete from dealers table first
        try {
            const { error } = await supabase
                .from('dealers')
                .delete()
                .eq('id', id);

            if (!error) {
                return true;
            }
        } catch (err) {
            console.log('Dealers table not found, trying auth.users instead:', err);
        }

        // If dealers table doesn't exist, try deleting the auth user
        // This will cascade to user_profiles due to foreign key constraints
        const { error } = await supabase.auth.admin.deleteUser(id);

        if (error) {
            console.error('Error deleting user:', error);
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteDealer:', error);
        throw error;
    }
};
