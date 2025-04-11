
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
    // Get request data
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Missing session ID",
            details: "Session ID is required"
          }
        }),
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
        JSON.stringify({ 
          error: { 
            message: "Missing authorization header",
            details: "You must be authenticated to verify purchases"
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
    });
    
    try {
      // Retrieve the session to confirm payment
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status !== 'paid') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Payment not complete" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Extract application IDs from metadata
      const applicationIdsString = session.metadata?.application_ids;
      if (!applicationIdsString) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "No application IDs found in session metadata" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const applicationIds = applicationIdsString.split(',');
      const dealerId = session.metadata?.dealer_id;
      
      // Verify that the dealer ID matches the current user
      if (dealerId !== user.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "User ID does not match dealer ID in payment session" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Record the downloads in the database
      const timestamp = new Date().toISOString();
      
      for (const appId of applicationIds) {
        // Check if already downloaded
        const { data: existingDownload } = await supabase
          .from('application_downloads')
          .select('id')
          .eq('application_id', appId)
          .eq('dealer_id', dealerId)
          .maybeSingle();
        
        if (!existingDownload) {
          await supabase
            .from('application_downloads')
            .insert({
              application_id: appId,
              dealer_id: dealerId,
              downloaded_at: timestamp,
              payment_session_id: sessionId,
              amount_paid: session.metadata?.unit_price || 0
            });
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Downloads recorded successfully"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError) {
      console.error("Error verifying payment session:", stripeError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Stripe error",
            details: stripeError.message || "Error verifying payment session"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error verifying purchase:", error);
    return new Response(
      JSON.stringify({ 
        error: { 
          message: error.message || "Unknown error",
          details: "An unexpected error occurred while verifying the purchase."
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
