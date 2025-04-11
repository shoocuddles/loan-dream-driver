
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    // Get request params
    const { applicationId, priceType, couponId } = await req.json();
    
    if (!applicationId || !priceType) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Stripe with the provided key
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Fetch the appropriate price ID for the requested price type
    const { data: priceMapping, error: priceError } = await supabase
      .from('stripe_price_mappings')
      .select('price_id, amount')
      .eq('type', priceType)
      .single();
      
    if (priceError || !priceMapping) {
      console.error("Error fetching price mapping:", priceError);
      return new Response(
        JSON.stringify({ error: "Price not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Get application details for metadata
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('fullname, email, city, vehicletype')
      .eq('id', applicationId)
      .single();
      
    if (appError) {
      console.error("Error fetching application:", appError);
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Create checkout session parameters
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceMapping.price_id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin") || ""}/dealers?success=true&session_id={CHECKOUT_SESSION_ID}&application_id=${applicationId}`,
      cancel_url: `${req.headers.get("origin") || ""}/dealers?canceled=true`,
      metadata: {
        applicationId: applicationId,
        priceType: priceType,
        applicantName: application.fullname,
        applicantCity: application.city,
        vehicleType: application.vehicletype
      },
    };
    
    // Add coupon if provided
    if (couponId) {
      sessionParams.discounts = [
        {
          coupon: couponId,
        },
      ];
    }
    
    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log("Created checkout session:", session.id);
    
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
