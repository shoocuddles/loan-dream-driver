
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the coupon parameters
    const {
      name,
      percentOff,
      amountOff,
      duration,
      durationInMonths,
      maxRedemptions,
      expiresAt,
    } = await req.json();
    
    // Validate required parameters
    if (!name || !duration) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Check that at least one discount type is provided
    if (percentOff === undefined && amountOff === undefined) {
      return new Response(
        JSON.stringify({ error: "Either percentOff or amountOff must be provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Check that only one discount type is provided
    if (percentOff !== undefined && amountOff !== undefined) {
      return new Response(
        JSON.stringify({ error: "Only one of percentOff or amountOff should be provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Validate duration and durationInMonths
    if (duration === 'repeating' && !durationInMonths) {
      return new Response(
        JSON.stringify({ error: "durationInMonths is required when duration is 'repeating'" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Prepare coupon parameters
    const couponParams: Stripe.CouponCreateParams = {
      name,
      duration,
    };
    
    // Add discount type
    if (percentOff !== undefined) {
      couponParams.percent_off = percentOff;
    } else {
      // Amount should be in cents
      couponParams.amount_off = amountOff;
      couponParams.currency = 'usd';
    }
    
    // Add optional parameters
    if (duration === 'repeating' && durationInMonths) {
      couponParams.duration_in_months = durationInMonths;
    }
    
    if (maxRedemptions) {
      couponParams.max_redemptions = maxRedemptions;
    }
    
    if (expiresAt) {
      couponParams.redeem_by = parseInt(expiresAt);
    }
    
    // Create the coupon
    const coupon = await stripe.coupons.create(couponParams);
    
    return new Response(
      JSON.stringify({
        id: coupon.id,
        name: coupon.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating coupon:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
