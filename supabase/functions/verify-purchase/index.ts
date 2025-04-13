
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
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe API key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Retrieve the session to verify payment status
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Payment has not been processed yet" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get dealer ID from metadata
    const dealerId = session.metadata?.dealer_id;
    if (!dealerId) {
      throw new Error("Dealer ID not found in session metadata");
    }

    // Get application IDs - handle both direct IDs and batch IDs
    let applicationIds: string[] = [];
    
    // Check if this is a batch purchase
    if (session.metadata?.batch_id) {
      console.log("Processing batch purchase with batch ID:", session.metadata.batch_id);
      
      // Retrieve application IDs from the batch record
      const { data: batchData, error: batchError } = await supabase
        .from('application_batch_purchases')
        .select('application_ids')
        .eq('id', session.metadata.batch_id)
        .single();
      
      if (batchError || !batchData) {
        console.error("Error retrieving batch purchase data:", batchError);
        throw new Error("Batch purchase data not found");
      }
      
      applicationIds = batchData.application_ids;
      
      // Update the batch record to mark it as processed
      await supabase
        .from('application_batch_purchases')
        .update({
          is_processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', session.metadata.batch_id);
      
    } else if (session.metadata?.application_ids) {
      // Direct application IDs in metadata
      applicationIds = session.metadata.application_ids.split(',');
    } else {
      throw new Error("No application IDs found in session metadata");
    }
    
    console.log(`Processing ${applicationIds.length} application purchases for dealer ${dealerId}`);

    // Calculate the price per application (total amount / quantity)
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const amount = lineItems.data[0]?.amount_total / 100 / applicationIds.length || 0;

    // Record a purchase for each application
    let successCount = 0;
    for (const applicationId of applicationIds) {
      const { data: purchaseResult, error: purchaseError } = await supabase.rpc(
        'record_dealer_purchase',
        {
          p_dealer_id: dealerId,
          p_application_id: applicationId,
          p_payment_id: session.payment_intent as string,
          p_payment_amount: amount,
          p_stripe_session_id: sessionId,
          p_discount_applied: session.metadata?.has_discount === 'true',
          p_discount_type: session.metadata?.discount_type,
          p_discount_amount: null
        }
      );

      if (purchaseError) {
        console.error(`Error recording purchase for application ${applicationId}:`, purchaseError);
      } else {
        successCount++;
      }
    }

    console.log(`Successfully recorded ${successCount} out of ${applicationIds.length} purchases for dealer ${dealerId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchasedCount: successCount,
        totalCount: applicationIds.length,
        paymentId: session.payment_intent,
        amount: lineItems.data[0]?.amount_total / 100 || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error verifying purchase:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
