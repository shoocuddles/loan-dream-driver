
import { SystemSettings } from '@/lib/types/dealer-dashboard';
import { supabase } from '@/integrations/supabase/client';

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
