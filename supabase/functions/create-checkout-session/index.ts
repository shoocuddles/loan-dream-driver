
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing checkout session request");
    
    // Get request data
    const { applicationIds, priceType, couponId } = await req.json();
    
    console.log("Request data:", { applicationIds, priceType, couponId });
    
    if (!applicationIds || !applicationIds.length || !priceType) {
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Missing required parameters",
            details: "Application IDs and price type are required"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Server configuration error",
            details: "Missing Supabase credentials"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authentication header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Missing authorization header",
            details: "You must be authenticated to purchase applications"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Get user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Invalid authentication token",
            details: userError?.message || "Authentication failed"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    console.log("Authenticated user:", user.id);
    
    // Get dealer info from user_profiles
    const { data: dealer, error: dealerError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (dealerError || !dealer) {
      console.error("Dealer profile not found:", dealerError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Dealer not found",
            details: dealerError?.message || "Your dealer account could not be found"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    console.log("Found dealer profile:", dealer.id);
    
    // Get application info for each application
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('id, fullname, email, city')
      .in('id', applicationIds);
    
    if (appError || !applications || applications.length === 0) {
      console.error("Error fetching applications:", appError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Applications not found",
            details: appError?.message || "The requested applications could not be found"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    console.log("Found applications:", applications.length);
    
    // Get system settings for pricing
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .single();
    
    if (settingsError || !settings) {
      console.error("System settings not found:", settingsError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "System settings not found",
            details: settingsError?.message || "Could not retrieve pricing information"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Check which applications are already downloaded
    const { data: downloadedApps, error: downloadError } = await supabase
      .from('application_downloads')
      .select('application_id')
      .eq('dealer_id', dealer.id)
      .in('application_id', applicationIds);
    
    const downloadedIds = downloadedApps ? downloadedApps.map(d => d.application_id) : [];
    const applicationsToCharge = applications.filter(app => !downloadedIds.includes(app.id));
    
    console.log("Applications to charge:", applicationsToCharge.length);
    
    if (applicationsToCharge.length === 0) {
      // All applications already purchased
      return new Response(
        JSON.stringify({
          message: "All selected applications have already been purchased",
          alreadyPurchased: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("Stripe secret key not configured");
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Stripe configuration error",
            details: "Stripe secret key is not configured in the environment"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Check or create Stripe customer
    let customerId = dealer.stripe_customer_id;
    
    try {
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
          
        console.log("Created new Stripe customer:", customerId);
      }
      
      // Calculate total price
      const unitPrice = priceType === 'discounted' ? settings.discounted_price : settings.standard_price;
      const totalAmount = Math.round(unitPrice * applicationsToCharge.length * 100); // Convert to cents for Stripe
      
      console.log("Calculated price:", { unitPrice, totalAmount });
      
      // Create a checkout session
      const sessionParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Application Purchase${applicationsToCharge.length > 1 ? ' (Multiple)' : ''}`,
                description: `${applicationsToCharge.length} Application${applicationsToCharge.length > 1 ? 's' : ''}`
              },
              unit_amount: unitPrice * 100, // Convert to cents
              tax_behavior: 'exclusive',
            },
            quantity: applicationsToCharge.length,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.get("origin")}/dealer-dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/dealer-dashboard?payment_cancelled=true`,
        metadata: {
          dealer_id: dealer.id,
          price_type: priceType,
          application_count: applicationsToCharge.length.toString(),
          application_ids: applicationsToCharge.map(app => app.id).join(','),
          unit_price: unitPrice.toString()
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
      
      console.log("Creating checkout session with params:", JSON.stringify(sessionParams, null, 2));
      
      const session = await stripe.checkout.sessions.create(sessionParams);
      
      console.log("Checkout session created:", session.id);
      
      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          url: session.url
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError) {
      console.error("Error creating checkout session:", stripeError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Stripe error",
            details: stripeError.message || "Error creating Stripe checkout session" 
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: { 
          message: error.message || "Unknown error",
          details: "An unexpected error occurred while processing the request."
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
