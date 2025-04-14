
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
    
    const { applicationIds, priceType, couponId, applicationDetails, ageDiscounts } = requestData;
    
    if (!applicationIds || !priceType) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
      .select('standard_price, discounted_price, age_discount_percentage')
      .single();
    
    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "System settings not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Check if any of the applications have been purchased before to apply discounted price
    const applicationIdsArray = Array.isArray(applicationIds) ? applicationIds : [applicationIds];
    
    // Check if all applications have already been purchased by this dealer
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .in('application_id', applicationIdsArray)
      .eq('dealer_id', dealer.id)
      .eq('is_active', true);
    
    if (purchaseError) {
      console.error("Error checking purchase history:", purchaseError);
    }
    
    // If all applications have been purchased already, return a specific response
    if (purchaseData && purchaseData.length === applicationIdsArray.length) {
      console.log("All applications already purchased by this dealer");
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "All selected applications have already been purchased", 
            code: "already_purchased",
            details: "You can access these applications in your Purchased Applications tab"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Filter out any applications that have already been purchased
    const alreadyPurchasedIds = purchaseData ? purchaseData.map(item => item.application_id) : [];
    const applicationIdsToProcess = applicationIdsArray.filter(id => !alreadyPurchasedIds.includes(id));
    
    if (applicationIdsToProcess.length === 0) {
      console.log("All applications already purchased by this dealer");
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "All selected applications have already been purchased", 
            code: "already_purchased",
            details: "You can access these applications in your Purchased Applications tab"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Create a map of application IDs to purchase counts
    const purchaseCounts = {};
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
    
    // Calculate total price based on purchase history and age discounts
    let totalAmount = 0;
    let hasDiscounted = false;
    let ageDiscountCount = 0;
    let previousPurchaseCount = 0;
    let standardPriceCount = 0;
    
    // Create a map of application IDs to their age discount status
    const ageDiscountMap = {};
    if (ageDiscounts && Array.isArray(ageDiscounts)) {
      ageDiscounts.forEach(item => {
        ageDiscountMap[item.id] = true;
      });
    }
    
    // Calculate the price for each application to be processed
    applicationIdsToProcess.forEach(appId => {
      const isPreviouslyPurchased = purchaseCounts[appId] && purchaseCounts[appId] > 0;
      const hasAgeDiscount = ageDiscountMap[appId] === true;
      let appPrice = settings.standard_price;
      
      // Apply age discount if applicable
      if (hasAgeDiscount) {
        const discountMultiplier = (100 - settings.age_discount_percentage) / 100;
        appPrice = settings.standard_price * discountMultiplier;
        hasDiscounted = true;
        ageDiscountCount++;
      } 
      // Apply purchase history discount if applicable and no age discount
      else if (isPreviouslyPurchased) {
        appPrice = settings.discounted_price;
        hasDiscounted = true;
        previousPurchaseCount++;
      } 
      // Otherwise apply standard price or the requested price type
      else {
        appPrice = priceType === 'discounted' ? settings.discounted_price : settings.standard_price;
        if (priceType === 'discounted') {
          hasDiscounted = true;
        } else {
          standardPriceCount++;
        }
      }
      
      totalAmount += appPrice;
    });
    
    console.log(`Total price calculated: ${totalAmount} for ${applicationIdsToProcess.length} applications`);
    console.log(`Age discounts: ${ageDiscountCount}, Previous purchases: ${previousPurchaseCount}, Standard: ${standardPriceCount}`);
    
    // Ensure we have a minimum amount to satisfy Stripe's minimum charge requirement
    if (totalAmount < 0.50) {
      console.log(`Amount too small (${totalAmount}), setting minimum amount to $0.50`);
      totalAmount = 0.50;
    }
    
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
    const metadata = {
      dealer_id: dealer.id,
      price_type: priceType,
      unit_price: (totalAmount / applicationIdsToProcess.length).toString(),
      has_discount: hasDiscounted ? 'true' : 'false',
      discount_type: hasDiscounted ? 'mixed' : null,
      application_count: applicationIdsToProcess.length.toString(),
      age_discount_count: ageDiscountCount.toString(),
      previous_purchase_count: previousPurchaseCount.toString()
    };
    
    // Store application IDs in chunks to avoid exceeding metadata size limit
    // Stripe has a limit of 500 characters per metadata value
    if (applicationIdsToProcess.length === 1) {
      metadata.application_ids = applicationIdsToProcess[0];
    } else {
      // For multiple applications, store only the count in metadata
      // and save full list to a database record that we can retrieve later
      
      // Create a temporary purchase record to store all application IDs
      const { data: batchRecord, error: batchError } = await supabase
        .from('application_batch_purchases')
        .insert({
          dealer_id: dealer.id,
          application_ids: applicationIdsToProcess,
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
              description: applicationIdsToProcess.length > 1 ? 
                `${applicationIdsToProcess.length} Applications` : 
                `Single Application Purchase`
            },
            unit_amount: Math.round(totalAmount * 100 / applicationIdsToProcess.length), // Convert to cents
            tax_behavior: 'exclusive',
          },
          quantity: applicationIdsToProcess.length,
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
    
    try {
      const session = await stripe.checkout.sessions.create(sessionParams);
      console.log("Checkout session created:", session.id);
      
      return new Response(
        JSON.stringify({ 
          sessionId: session.id,
          url: session.url,
          isLiveMode: session.livemode
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError) {
      console.error("Error creating checkout session in Stripe:", stripeError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: stripeError.message || "Error creating checkout session", 
            code: stripeError.code || "stripe_error",
            details: stripeError.raw ? JSON.stringify(stripeError.raw) : stripeError.message
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ 
        error: { 
          message: error.message || "Unknown error creating checkout session",
          code: error.code || "unknown_error",
          details: error.stack || error.message || "Unknown error"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
