
import { supabase } from '@/integrations/supabase/client';
import { StripePrice, StripeCoupon, CreateCouponParams, StripeCheckoutParams, CheckoutSessionResponse, StripeError, PurchaseResult } from '@/lib/types/stripe';

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
 * Helper function to call Supabase Edge Functions with proper error handling
 */
const callStripeFunction = async <T>(
  functionName: string,
  body: any
): Promise<StripeResponse<T>> => {
  try {
    console.log(`🔄 Calling Stripe function: ${functionName}`, body);
    
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    
    if (error) {
      console.error(`❌ Error from ${functionName}:`, error);
      return {
        error: {
          message: error.message || `Error calling ${functionName}`,
          code: error.code || 'unknown_error',
          details: error.message
        }
      };
    }
    
    if (!data) {
      return {
        error: {
          message: `No data returned from ${functionName}`,
          code: 'no_data',
          details: 'The function returned successfully but no data was provided'
        }
      };
    }
    
    console.log(`✅ ${functionName} successful:`, data);
    return { data: data as T };
  } catch (error: any) {
    console.error(`❌ Exception in ${functionName}:`, error);
    return {
      error: {
        message: error.message || `Unexpected error in ${functionName}`,
        code: error.code || 'unexpected_error',
        details: error.stack || error.message
      }
    };
  }
};

/**
 * Synchronizes system settings prices with Stripe
 */
export const syncPricesToStripe = async (
  standardPrice: number, 
  discountedPrice: number
): Promise<StripeResponse<{ success: boolean }>> => {
  return callStripeFunction('sync-prices', { standardPrice, discountedPrice });
};

/**
 * Creates a new coupon in Stripe
 */
export const createStripeCoupon = async (
  params: CreateCouponParams
): Promise<StripeResponse<{ id: string; name: string }>> => {
  return callStripeFunction('create-coupon', params);
};

/**
 * Fetches all active coupons from Stripe
 */
export const listStripeCoupons = async (): Promise<StripeResponse<StripeCoupon[]>> => {
  return callStripeFunction('list-coupons', {});
};

/**
 * Fetches Stripe product prices
 */
export const getStripePrices = async (): Promise<StripeResponse<StripePrice[]>> => {
  return callStripeFunction('get-prices', {});
};

/**
 * Fetches Stripe account information
 * If accountId is provided, fetches that specific account (for dealer accounts)
 * Otherwise fetches the platform account information
 */
export const getStripeAccountInfo = async (accountId?: string): Promise<StripeResponse<StripeAccount>> => {
  return callStripeFunction('get-account-info', accountId ? { accountId } : {});
};

/**
 * Creates a checkout session for application purchases
 */
export const createCheckoutSession = async (
  params: StripeCheckoutParams
): Promise<StripeResponse<CheckoutSessionResponse>> => {
  try {
    console.log('🛒 Creating checkout session for applications:', params.applicationIds);
    
    // First validate parameters
    if (!params.applicationIds || !params.applicationIds.length) {
      return {
        error: {
          message: 'Missing application IDs',
          code: 'missing_params',
          details: 'You must provide at least one application ID to purchase'
        }
      };
    }
    
    if (!params.priceType) {
      return {
        error: {
          message: 'Missing price type',
          code: 'missing_params',
          details: 'You must specify a price type (standard or discounted)'
        }
      };
    }
    
    // Add logging for the full request
    console.log('🔍 Full checkout session request parameters:', JSON.stringify(params, null, 2));
    
    // Check if the current user is authenticated
    const { data: { session }} = await supabase.auth.getSession();
    if (!session) {
      return {
        error: {
          message: 'Authentication required',
          code: 'auth_required',
          details: 'You must be logged in to create a checkout session'
        }
      };
    }
    
    // Call create-checkout-session edge function
    const functionName = 'create-checkout-session';
    const { data, error } = await supabase.functions.invoke(functionName, { body: params });
    
    if (error) {
      console.error('❌ Error from Supabase functions:', error);
      return {
        error: {
          message: error.message || `Error calling ${functionName}`,
          code: error.code || 'function_error',
          details: error.message
        }
      };
    }
    
    if (!data) {
      return {
        error: {
          message: 'No data returned from checkout session creation',
          code: 'no_data',
          details: 'The function returned successfully but no data was provided'
        }
      };
    }
    
    // Handle case where function returns an error object
    if (data.error) {
      return {
        error: {
          message: data.error.message || 'Unknown error in checkout session creation',
          code: data.error.code || 'function_returned_error',
          details: data.error.details || data.error.message
        }
      };
    }
    
    // Validate the URL returned from Stripe
    if (!data.url) {
      return {
        error: {
          message: 'No checkout URL returned from Stripe',
          code: 'invalid_response',
          details: 'The checkout session was created but no URL was provided'
        }
      };
    }
    
    // Check if the session is using live mode and provide a warning
    if (data.isLiveMode) {
      console.warn('⚠️ Using Stripe in LIVE mode - real charges will be made!');
    }
    
    console.log('✅ Successfully created checkout session:', data);
    
    // Add a small delay before redirecting to ensure the session is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { data };
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    return { 
      error: { 
        message: error.message || 'Unknown error creating checkout session',
        code: error.code || 'unknown_error',
        details: error.details || error.message || 'Check that the Supabase function is deployed correctly'
      } 
    };
  }
};

/**
 * Completes the purchase process and records application downloads
 */
export const completePurchase = async (sessionId: string): Promise<StripeResponse<{ success: boolean }>> => {
  return callStripeFunction('verify-purchase', { sessionId });
};
