
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
    const requestData = await req.json();
    console.log("Request data:", requestData);
    
    // Special handling for test requests from StripeDebug component
    if (requestData.test === true) {
      console.log("Test request detected, returning mock response");
      return new Response(
        JSON.stringify({ 
          message: "This is a test response from the create-checkout function",
          success: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { applicationIds, priceType, couponId, applicationDetails } = requestData;
    
    if (!applicationIds || !priceType) {
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
      .eq('id', Array.isArray(applicationIds) ? applicationIds[0] : applicationIds)
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
    
    // Check if any of the applications have been purchased before to apply discounted price
    const applicationIdsArray = Array.isArray(applicationIds) ? applicationIds : [applicationIds];
    
    // Fix for the group function issue
    // Instead of using .count() which requires a group function, get all records and count them in JS
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .in('application_id', applicationIdsArray)
      .eq('is_active', true);
    
    if (purchaseError) {
      console.error("Error checking purchase history:", purchaseError);
    }
    
    // Create a map of application IDs to purchase counts
    const purchaseCounts: Record<string, number> = {};
    if (purchaseData) {
      // Count purchases for each application ID
      purchaseData.forEach(item => {
        if (purchaseCounts[item.application_id]) {
          purchaseCounts[item.application_id]++;
        } else {
          purchaseCounts[item.application_id] = 1;
        }
      });
    }
    
    console.log("Purchase counts:", purchaseCounts);
    
    // Calculate total price based on purchase history
    let totalAmount = 0;
    let hasDiscounted = false;
    
    applicationIdsArray.forEach(appId => {
      const isPreviouslyPurchased = purchaseCounts[appId] && purchaseCounts[appId] > 0;
      const priceAmount = (priceType === 'discounted' || isPreviouslyPurchased) ? 
        settings.discounted_price : settings.standard_price;
      
      if (isPreviouslyPurchased) {
        hasDiscounted = true;
      }
      
      totalAmount += priceAmount;
    });
    
    const priceAmount = priceType === 'discounted' ? settings.discounted_price : settings.standard_price;
    
    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("Stripe secret key not configured");
      return new Response(
        JSON.stringify({ error: "Stripe configuration error: Missing API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Check or create Stripe customer
    let customerId = dealer.stripe_customer_id;
    
    if (!customerId) {
      // Create a new customer
      console.log("Creating new Stripe customer for:", user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        name: dealer.full_name || dealer.email,
        metadata: {
          dealer_id: dealer.id,
          company: dealer.company_name || "Not specified"
        }
      });
      
      customerId = customer.id;
      console.log("Created Stripe customer:", customerId);
      
      // Save customer ID back to user_profiles record
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', dealer.id);
    }
    
    // Prepare metadata - handle large batches of application IDs
    const metadata: Record<string, string> = {
      dealer_id: dealer.id,
      price_type: priceType,
      unit_price: (totalAmount / applicationIdsArray.length).toString(),
      has_discount: hasDiscounted ? 'true' : 'false',
      discount_type: hasDiscounted ? 'previous_purchase' : null,
      application_count: applicationIdsArray.length.toString()
    };
    
    // Store application IDs in chunks to avoid exceeding metadata size limit
    // Stripe has a limit of 500 characters per metadata value
    if (applicationIdsArray.length === 1) {
      metadata.application_ids = applicationIdsArray[0];
    } else {
      // For multiple applications, store only the count in metadata
      // and save full list to a database record that we can retrieve later
      
      // Create a temporary purchase record to store all application IDs
      const { data: batchRecord, error: batchError } = await supabase
        .from('application_batch_purchases')
        .insert({
          dealer_id: dealer.id,
          application_ids: applicationIdsArray,
          price_type: priceType,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (batchError) {
        console.error("Error creating batch purchase record:", batchError);
        // Continue anyway, we'll just have less detailed metadata
      } else if (batchRecord) {
        metadata.batch_id = batchRecord.id;
      }
    }
    
    // Add application info to metadata if available
    if (application) {
      metadata.application_client = application.fullname;
      if (application.email) metadata.application_email = application.email;
      if (application.city) metadata.application_city = application.city;
    }
    
    // Create a checkout session
    const sessionParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Application Purchase`,
              description: applicationIdsArray.length > 1 ? 
                `${applicationIdsArray.length} Applications` : 
                `Single Application Purchase`
            },
            unit_amount: Math.round(totalAmount * 100 / applicationIdsArray.length), // Convert to cents
            tax_behavior: 'exclusive',
          },
          quantity: applicationIdsArray.length,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get("origin")}/dealer-dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dealer-dashboard?payment_cancelled=true`,
      metadata: metadata
    };
    
    // Add coupon if provided
    if (couponId) {
      sessionParams.discounts = [
        {
          coupon: couponId
        }
      ];
    }
    
    console.log("Creating Stripe checkout session with params:", JSON.stringify(sessionParams));
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("Checkout session created:", session.id);
    
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
