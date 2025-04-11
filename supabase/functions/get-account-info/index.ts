
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";

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
          error: "Stripe secret key not configured",
          details: "The STRIPE_SECRET_KEY environment variable is not set in the edge function secrets."
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    console.log("Initializing Stripe with provided secret key...");
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    console.log("Fetching account information from Stripe");
    
    try {
      // Get account information
      const account = await stripe.account.retrieve();
      
      console.log("Successfully retrieved Stripe account:", account.id);
      
      // Return only the necessary information
      const accountInfo = {
        id: account.id,
        business_type: account.business_type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        default_currency: account.default_currency,
        display_name: account.settings?.dashboard?.display_name,
      };
      
      return new Response(
        JSON.stringify(accountInfo),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);
      
      // Check if it's an authentication error
      if (stripeError.type === 'StripeAuthenticationError' || 
          stripeError.message?.includes('invalid api key') ||
          stripeError.message?.includes('API key')) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid Stripe API key",
            details: "Your Stripe API key appears to be invalid or has insufficient permissions."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      // Generic Stripe API error
      return new Response(
        JSON.stringify({ 
          error: "Stripe API error", 
          details: stripeError.message 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching account info:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "An unexpected error occurred while processing the request."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
