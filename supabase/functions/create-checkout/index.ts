
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
    // Get request data
    const { applicationId, priceType, couponId } = await req.json();
    
    if (!applicationId || !priceType) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Get the authentication header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Get user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Get dealer info
    const { data: dealer, error: dealerError } = await supabase
      .from('dealers')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (dealerError || !dealer) {
      return new Response(
        JSON.stringify({ error: "Dealer not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Get application info to include in the metadata
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('fullname, email, city')
      .eq('id', applicationId)
      .single();
    
    if (appError) {
      console.error("Error fetching application:", appError);
    }
    
    // Get the appropriate price from Stripe mappings
    const { data: priceMapping, error: priceMappingError } = await supabase
      .from('stripe_price_mappings')
      .select('price_id, amount')
      .eq('type', priceType)
      .single();
    
    if (priceMappingError || !priceMapping) {
      return new Response(
        JSON.stringify({ error: "Price mapping not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Check or create Stripe customer
    let customerId = dealer.stripe_customer_id;
    
    if (!customerId) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: dealer.name,
        metadata: {
          dealer_id: dealer.id,
          company: dealer.company
        }
      });
      
      customerId = customer.id;
      
      // Save customer ID back to dealer record
      await supabase
        .from('dealers')
        .update({ stripe_customer_id: customerId })
        .eq('id', dealer.id);
    }
    
    // Create a checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceMapping.price_id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/dealers?payment_success=true&application_id=${applicationId}`,
      cancel_url: `${req.headers.get("origin")}/dealers?payment_cancelled=true`,
      metadata: {
        dealer_id: dealer.id,
        application_id: applicationId,
        price_type: priceType,
        amount: priceMapping.amount.toString()
      }
    };
    
    // Add coupon if provided
    if (couponId) {
      sessionParams.discounts = [
        {
          coupon: couponId
        }
      ];
    }
    
    // Add application info to metadata if available
    if (application) {
      sessionParams.metadata.application_client = application.fullname;
      sessionParams.metadata.application_email = application.email;
      sessionParams.metadata.application_city = application.city;
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    // Create a pending payment record
    await supabase.from('application_downloads').insert({
      application_id: applicationId,
      dealer_id: dealer.id,
      payment_amount: priceMapping.amount,
      payment_status: 'pending',
      payment_id: session.id,
      is_discounted: priceType === 'discounted'
    });
    
    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url
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
