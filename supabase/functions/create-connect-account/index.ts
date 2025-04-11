
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      console.error("Stripe secret key not found in environment variables");
      return new Response(
        JSON.stringify({ 
          error: {
            message: "Stripe secret key not configured",
            details: "The STRIPE_SECRET_KEY environment variable is not set in the edge function secrets."
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { dealerId } = await req.json();
    
    if (!dealerId) {
      return new Response(
        JSON.stringify({ error: "Dealer ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get dealer info
    const { data: dealer, error: dealerError } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', dealerId)
      .single();
    
    if (dealerError || !dealer) {
      return new Response(
        JSON.stringify({ error: "Dealer not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    console.log("Creating Stripe connect account link for dealer:", dealerId);
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    // Create a Stripe Connect account for the dealer
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CA',
      email: dealer.email,
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
      },
      business_type: 'individual',
      business_profile: {
        name: dealer.full_name || 'Dealer',
      }
    });
    
    // Store the account ID in the dealer's profile
    await supabase
      .from('user_profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', dealerId);
    
    // Create an account link to onboard the dealer
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/dealer-dashboard`,
      return_url: `${req.headers.get("origin")}/dealer-dashboard`,
      type: 'account_onboarding',
    });
    
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error creating connect account:", error);
    return new Response(
      JSON.stringify({ 
        error: {
          message: error.message,
          details: "An unexpected error occurred while processing the request."
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
