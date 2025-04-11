
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
    
    // First check if the application already has a lock by this dealer
    const currentLock = await checkApplicationLock(applicationId);
    
    // If the application is already permanently locked by this dealer, don't charge again
    if (currentLock?.isLocked && currentLock.isOwnLock && currentLock.lockType === 'permanent') {
      console.log('Application is already permanently locked by this dealer - no additional lock needed');
      return true;
    }
    
    // If the application has a temporary lock by this dealer that hasn't expired,
    // don't allow another temporary lock but allow upgrade to permanent
    if (currentLock?.isLocked && currentLock.isOwnLock && 
        currentLock.lockType !== 'permanent' && lockType !== 'permanent') {
      console.log('Application already has a temporary lock by this dealer - cannot add another temporary lock');
      toast.warning('This application already has a temporary lock. You can only upgrade to a permanent lock.');
      return false;
    }
    
    // If the application is locked by another dealer, prevent this dealer from locking
    if (currentLock?.isLocked && !currentLock.isOwnLock) {
      console.log('Application is locked by another dealer - cannot lock');
      toast.error('This application is currently locked by another dealer.');
      return false;
    }
    
    // Create or update the lock
    const { data, error } = await rpcCall<{ success: boolean, lockId?: string }>('lock_application', {
      p_application_id: applicationId,
      p_dealer_id: userId.user.id,
      p_lock_type: lockType,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount
    });
    
    if (error) throw error;
    
    // If successful and this is a permanent lock, we should update any other dealers' view
    // by making the application unavailable in the available section
    if (data?.success && lockType === 'permanent') {
      await rpcCall('mark_application_permanently_locked', {
        p_application_id: applicationId
      }).catch(err => {
        console.error('Error marking application as permanently locked:', err);
        // Don't throw here, the lock itself was successful
      });
    }
    
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

/**
 * Process locks after payment has been confirmed
 */
export const processLocksAfterPayment = async (
  applicationIds: string[],
  lockType: LockType,
  paymentId: string,
  paymentAmount: number
): Promise<number> => {
  try {
    console.log(`Processing locks for ${applicationIds.length} applications after payment confirmation`);
    
    let successCount = 0;
    
    // Process each application lock
    for (const appId of applicationIds) {
      const lockSuccess = await lockApplication(appId, lockType, paymentId, paymentAmount / applicationIds.length);
      if (lockSuccess) successCount++;
    }
    
    return successCount;
  } catch (error) {
    console.error('Error processing locks after payment:', error);
    return 0;
  }
};
