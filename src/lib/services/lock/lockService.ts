
import { LockType, LockInfo, LockoutPeriod } from '@/lib/types/dealer-dashboard';
import { supabase, rpcCall } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    
    console.log('Available lockout periods:', data);
    
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
