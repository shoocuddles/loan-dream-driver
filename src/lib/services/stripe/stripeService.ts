
import { supabase } from '@/integrations/supabase/client';

interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  active: boolean;
}

interface StripeError {
  message: string;
  code?: string;
}

interface StripeResponse<T> {
  data?: T;
  error?: StripeError;
}

interface CreateCouponParams {
  name: string;
  percentOff?: number;
  amountOff?: number;
  duration: 'once' | 'forever' | 'repeating';
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: string;
}

/**
 * Synchronizes system settings prices with Stripe
 */
export const syncPricesToStripe = async (
  standardPrice: number, 
  discountedPrice: number
): Promise<StripeResponse<{ success: boolean }>> => {
  try {
    console.log('🔄 Syncing prices to Stripe:', { standardPrice, discountedPrice });
    
    const { data, error } = await supabase.functions.invoke('sync-prices', {
      body: { standardPrice, discountedPrice }
    });
    
    if (error) throw error;
    
    console.log('✅ Successfully synced prices to Stripe:', data);
    return { data: { success: true } };
  } catch (error: any) {
    console.error('❌ Error syncing prices to Stripe:', error.message);
    return { error: { message: error.message, code: error.code } };
  }
};

/**
 * Creates a new coupon in Stripe
 */
export const createStripeCoupon = async (
  params: CreateCouponParams
): Promise<StripeResponse<{ id: string; name: string }>> => {
  try {
    console.log('🎟️ Creating new Stripe coupon:', params);
    
    const { data, error } = await supabase.functions.invoke('create-coupon', {
      body: params
    });
    
    if (error) throw error;
    
    console.log('✅ Successfully created coupon:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error creating coupon:', error.message);
    return { error: { message: error.message, code: error.code } };
  }
};

/**
 * Fetches all active coupons from Stripe
 */
export const listStripeCoupons = async (): Promise<StripeResponse<any[]>> => {
  try {
    console.log('🔍 Fetching Stripe coupons');
    
    const { data, error } = await supabase.functions.invoke('list-coupons');
    
    if (error) throw error;
    
    console.log('✅ Successfully fetched coupons:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error fetching coupons:', error.message);
    return { error: { message: error.message, code: error.code } };
  }
};

/**
 * Fetches Stripe product prices
 */
export const getStripePrices = async (): Promise<StripeResponse<StripePrice[]>> => {
  try {
    console.log('🔍 Fetching Stripe prices');
    
    const { data, error } = await supabase.functions.invoke('get-prices');
    
    if (error) throw error;
    
    console.log('✅ Successfully fetched prices:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error fetching prices:', error.message);
    return { error: { message: error.message, code: error.code } };
  }
};
