import { supabase } from '@/integrations/supabase/client';
import { StripePrice, StripeCoupon, CreateCouponParams, StripeCheckoutParams, CheckoutSessionResponse, StripeError } from '@/lib/types/stripe';

interface StripeResponse<T> {
  data?: T;
  error?: StripeError;
}

interface StripeAccount {
  id: string;
  email: string;
  country: string;
  business_type: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
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
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
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
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
  }
};

/**
 * Fetches all active coupons from Stripe
 */
export const listStripeCoupons = async (): Promise<StripeResponse<StripeCoupon[]>> => {
  try {
    console.log('🔍 Fetching Stripe coupons');
    
    const { data, error } = await supabase.functions.invoke('list-coupons');
    
    if (error) throw error;
    
    console.log('✅ Successfully fetched coupons:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error fetching coupons:', error.message);
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
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
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
  }
};

/**
 * Fetches Stripe account information
 */
export const getStripeAccountInfo = async (): Promise<StripeResponse<StripeAccount>> => {
  try {
    console.log('🔍 Fetching Stripe account information');
    
    const { data, error } = await supabase.functions.invoke('get-account-info');
    
    if (error) throw error;
    
    console.log('✅ Successfully fetched Stripe account info:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error fetching Stripe account info:', error.message);
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
  }
};

/**
 * Creates a checkout session for application purchases
 */
export const createCheckoutSession = async (
  params: StripeCheckoutParams
): Promise<StripeResponse<CheckoutSessionResponse>> => {
  try {
    console.log('🛒 Creating checkout session for applications:', params.applicationIds);
    
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: params
    });
    
    if (error) throw error;
    
    console.log('✅ Successfully created checkout session:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error.message);
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
  }
};

/**
 * Completes the purchase process and records application downloads
 */
export const completePurchase = async (sessionId: string): Promise<StripeResponse<{ success: boolean }>> => {
  try {
    console.log('🔍 Verifying purchase with session ID:', sessionId);
    
    const { data, error } = await supabase.functions.invoke('verify-purchase', {
      body: { sessionId }
    });
    
    if (error) throw error;
    
    console.log('✅ Purchase verification complete:', data);
    return { data };
  } catch (error: any) {
    console.error('❌ Error verifying purchase:', error.message);
    return { 
      error: { 
        message: error.message, 
        code: error.code,
        details: error.details || error.message
      } 
    };
  }
};
