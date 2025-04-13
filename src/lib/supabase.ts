import { ApplicationForm, Dealer, SystemSettings } from './types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to handle RPC calls with better error handling
export async function rpcCall<T>(
  functionName: string,
  params: object
): Promise<{ data: T | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      console.error(`RPC call ${functionName} failed:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error(`Error in RPC call ${functionName}:`, error);
    return { data: null, error: { message: error.message } };
  }
}

export const getAllApplications = async () => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*');

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
};

export const getApplicationById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching application:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching application:", error);
    return null;
  }
};

export const getApplicationsByDealerId = async (dealerId: string) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('dealerId', dealerId);

    if (error) {
      console.error("Error fetching applications:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
};

export const insertApplication = async (applicationData: ApplicationForm) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([applicationData]);

    if (error) {
      console.error("Error inserting application:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error inserting application:", error);
    return null;
  }
};

export const updateApplicationStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error("Error updating application status:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating application status:", error);
    return false;
  }
};

export const getAllDealers = async (): Promise<Dealer[]> => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*');

    if (error) {
      console.error("Error fetching dealers:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return [];
  }
};

export const getDealerById = async (id: string): Promise<Dealer | null> => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching dealer:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching dealer:", error);
    return null;
  }
};

export const getDealerByEmail = async (email: string): Promise<Dealer | null> => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error("Error fetching dealer:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching dealer:", error);
    return null;
  }
};

export const insertDealer = async (dealerData: Dealer) => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .insert([dealerData]);

    if (error) {
      console.error("Error inserting dealer:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error inserting dealer:", error);
    return null;
  }
};

export const updateDealer = async (id: string, dealerData: Partial<Dealer>) => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .update(dealerData)
      .eq('id', id);

    if (error) {
      console.error("Error updating dealer:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating dealer:", error);
    return false;
  }
};

export const deleteDealer = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting dealer:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting dealer:", error);
    return false;
  }
};

export const getSystemSettings = async (): Promise<SystemSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error) {
      console.error("Error fetching system settings:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return null;
  }
};

export const updateSystemSettings = async (settings: Partial<SystemSettings>) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .update(settings)
      .eq('id', 1);

    if (error) {
      console.error("Error updating system settings:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating system settings:", error);
    return false;
  }
};

// Add these new functions for admin application management
export const updateApplication = async (applicationId: string, formData: any): Promise<boolean> => {
  try {
    console.log(`Updating application ${applicationId} with data:`, formData);
    
    const { error } = await supabase
      .from('applications')
      .update(formData)
      .eq('id', applicationId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating application:', error);
    throw error;
  }
};

export const lockApplicationAsAdmin = async (applicationId: string, lockType: string): Promise<boolean> => {
  try {
    console.log(`Admin locking application ${applicationId} with type ${lockType}`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    // Determine lock hours based on lock type
    let lockHours = 0;
    switch(lockType) {
      case '24hours':
        lockHours = 24;
        break;
      case '1week':
        lockHours = 24 * 7;
        break;
      case '2weeks':
        lockHours = 24 * 14;
        break;
      case 'permanent':
        lockHours = 24 * 365; // Nearly "permanent" (1 year)
        break;
      default:
        lockHours = 2; // Default to 2 hours for temporary locks
    }
    
    // Insert directly into application_locks table
    const { error } = await supabase
      .from('application_locks')
      .insert({
        application_id: applicationId,
        dealer_id: userId.user.id,
        expires_at: new Date(Date.now() + lockHours * 60 * 60 * 1000).toISOString(),
        lock_type: lockType,
        is_paid: true // No payment needed for admin locks
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error locking application as admin:', error);
    throw error;
  }
};

export const getApplicationDetails = async (applicationId: string) => {
  try {
    console.log(`Fetching details for application ${applicationId}`);
    
    // First get the application data
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    if (error) throw error;
    if (!application) return null;
    
    // Check for lock information
    const { data: lockInfo } = await supabase
      .from('application_locks')
      .select('*')
      .eq('application_id', applicationId)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Return combined data
    return {
      ...application,
      isLocked: !!lockInfo,
      lockExpiresAt: lockInfo?.expires_at,
      lockedBy: lockInfo?.dealer_id,
      lockType: lockInfo?.lock_type
    };
  } catch (error) {
    console.error('Error getting application details:', error);
    throw error;
  }
};
