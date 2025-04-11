
export interface StripeCoupon {
  id: string;
  name: string;
  percent_off?: number;
  amount_off?: number;
  duration: 'once' | 'forever' | 'repeating';
  duration_in_months?: number;
  max_redemptions?: number;
  times_redeemed: number;
  valid: boolean;
  created: number;
  expires_at?: number;
}

export interface CreateCouponParams {
  name: string;
  percentOff?: number;
  amountOff?: number;
  duration: 'once' | 'forever' | 'repeating';
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: string;
}

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  active: boolean;
}

export interface StripeCheckoutParams {
  applicationId: string;
  priceType: 'standard' | 'discounted';
  couponId?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface StripeAccountInfo {
  id: string;
  business_type?: string;
  country?: string;
  email?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  default_currency?: string;
  display_name?: string;
}
