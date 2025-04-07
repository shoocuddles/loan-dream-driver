
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { ApplicationItem, DownloadedApplication, LockType, LockoutPeriod, SystemSettings } from './types/dealer-dashboard';
import { toast } from 'sonner';

/**
 * Fetches available applications for the dealer
 */
export const fetchAvailableApplications = async (): Promise<ApplicationItem[]> => {
  try {
    console.log('🔍 Fetching available applications for dealer');
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<ApplicationItem[]>('get_applications_for_dealer', {
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    
    // Ensure vehicle type is mapped correctly
    const formattedData = data?.map(app => ({
      ...app,
      vehicleType: app.vehicleType || 'N/A' // Ensure vehicleType is displayed properly
    })) || [];
    
    console.log('Fetched applications:', formattedData);
    
    return formattedData;
  } catch (error: any) {
    console.error('❌ Error fetching available applications:', error.message);
    toast.error('Failed to load applications');
    return [];
  }
};

/**
 * Fetches downloaded applications for the dealer
 */
export const fetchDownloadedApplications = async (): Promise<DownloadedApplication[]> => {
  try {
    console.log('🔍 Fetching downloaded applications for dealer');
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<DownloadedApplication[]>('get_dealer_downloads', {
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Error fetching downloaded applications:', error.message);
    toast.error('Failed to load your purchased applications');
    return [];
  }
};

/**
 * Checks if an application is locked
 */
export const checkApplicationLock = async (applicationId: string): Promise<LockInfo | null> => {
  try {
    console.log(`🔍 Checking lock status for application ${applicationId}`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<LockInfo>('is_application_locked', {
      p_application_id: applicationId,
      p_current_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Error checking application lock:', error.message);
    return null;
  }
};

/**
 * Locks an application for the dealer
 */
export const lockApplication = async (applicationId: string, lockType: LockType, paymentId?: string, paymentAmount?: number): Promise<boolean> => {
  try {
    console.log(`🔒 Locking application ${applicationId} with type ${lockType}`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<{ success: boolean, lockId?: string }>('lock_application', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id,
      p_lock_type: lockType,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount
    });
    
    if (error) throw error;
    return data?.success || false;
  } catch (error: any) {
    console.error('❌ Error locking application:', error.message);
    toast.error(`Failed to lock application: ${error.message}`);
    return false;
  }
};

/**
 * Unlocks an application
 */
export const unlockApplication = async (applicationId: string): Promise<boolean> => {
  try {
    console.log(`🔓 Unlocking application ${applicationId}`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<{ success: boolean }>('unlock_application', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    return data?.success || false;
  } catch (error: any) {
    console.error('❌ Error unlocking application:', error.message);
    toast.error(`Failed to unlock application: ${error.message}`);
    return false;
  }
};

/**
 * Records an application download
 */
export const recordDownload = async (applicationId: string, paymentId?: string, paymentAmount?: number): Promise<boolean> => {
  try {
    console.log(`📥 Recording download for application ${applicationId}`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await rpcCall<{ success: boolean, alreadyDownloaded: boolean }>('record_application_download', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount
    });
    
    if (error) throw error;
    return data?.success || false;
  } catch (error: any) {
    console.error('❌ Error recording download:', error.message);
    toast.error(`Failed to record download: ${error.message}`);
    return false;
  }
};

/**
 * Fetches system settings
 */
export const fetchSystemSettings = async (): Promise<SystemSettings | null> => {
  try {
    console.log('🔍 Fetching system settings');
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      standardPrice: data.standard_price,
      discountedPrice: data.discounted_price,
      temporaryLockMinutes: data.temporary_lock_minutes
    };
  } catch (error: any) {
    console.error('❌ Error fetching system settings:', error.message);
    return null;
  }
};

/**
 * Fetches available lockout periods
 */
export const fetchLockoutPeriods = async (): Promise<LockoutPeriod[]> => {
  try {
    console.log('🔍 Fetching lockout periods');
    
    const { data, error } = await supabase
      .from('lockout_periods')
      .select('*')
      .eq('is_active', true)
      .order('hours', { ascending: true });
    
    if (error) throw error;
    return data.map(period => ({
      id: period.id,
      name: period.name,
      hours: period.hours,
      fee: period.fee,
      isActive: period.is_active
    }));
  } catch (error: any) {
    console.error('❌ Error fetching lockout periods:', error.message);
    return [];
  }
};

/**
 * Checks if an application has been downloaded by the current dealer
 */
export const isApplicationDownloaded = async (applicationId: string): Promise<boolean> => {
  try {
    console.log(`🔍 Checking if application ${applicationId} is downloaded`);
    
    const { data: userId } = await supabase.auth.getUser();
    if (!userId.user) {
      return false;
    }
    
    const { data, error } = await rpcCall<boolean>('is_application_downloaded_by_dealer', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id
    });
    
    if (error) throw error;
    return !!data;
  } catch (error: any) {
    console.error('❌ Error checking download status:', error.message);
    return false;
  }
};
