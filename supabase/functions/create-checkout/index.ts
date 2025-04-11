
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
    
    // Get dealer info from user_profiles
    const { data: dealer, error: dealerError } = await supabase
      .from('user_profiles')
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
    
    // Get system settings for pricing
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('standard_price, discounted_price')
      .single();
    
    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "System settings not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    const priceAmount = priceType === 'discounted' ? settings.discounted_price : settings.standard_price;
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Check or create Stripe customer
    let customerId = dealer.stripe_customer_id;
    
    if (!customerId) {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: dealer.full_name || dealer.email,
        metadata: {
          dealer_id: dealer.id,
          company: dealer.company_name || "Not specified"
        }
      });
      
      customerId = customer.id;
      
      // Save customer ID back to user_profiles record
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', dealer.id);
    }
    
    // Create a checkout session
    const sessionParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Application Purchase`,
              description: `Single Application Purchase`
            },
            unit_amount: Math.round(priceAmount * 100), // Convert to cents
            tax_behavior: 'exclusive',
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/dealer-dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dealer-dashboard?payment_cancelled=true`,
      metadata: {
        dealer_id: dealer.id,
        application_ids: applicationId,
        price_type: priceType,
        unit_price: priceAmount.toString()
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
