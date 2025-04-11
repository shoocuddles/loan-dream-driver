
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Get the event data
    const body = await req.text();
    
    // Verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Process the successful payment
      await handleSuccessfulPayment(session, supabase);
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error handling webhook: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function handleSuccessfulPayment(session, supabase) {
  const dealerId = session.metadata.dealer_id;
  const applicationIds = session.metadata.application_ids.split(',');
  const unitPrice = parseFloat(session.metadata.unit_price);
  
  // Get system settings for lock duration
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .single();
  
  // Default lock time is 1 hour if not configured
  const lockHours = settings?.temporary_lock_minutes 
    ? settings.temporary_lock_minutes / 60 
    : 1;
  
  console.log(`Processing payment for dealer ${dealerId}, applications: ${applicationIds.join(', ')}`);
  
  // Process each application
  for (const appId of applicationIds) {
    try {
      console.log(`Processing application ${appId}`);
      
      // Record the download
      const { data: downloadData, error: downloadError } = await supabase
        .from('application_downloads')
        .insert({
          application_id: appId,
          dealer_id: dealerId,
          payment_id: session.id,
          payment_amount: unitPrice
        })
        .select()
        .single();
      
      if (downloadError) {
        console.error(`Error recording download for ${appId}:`, downloadError);
        continue;
      }
      
      console.log(`Successfully recorded download: ${downloadData.id}`);
      
      // Apply automatic lock (1 hour)
      const lockExpiry = new Date();
      lockExpiry.setHours(lockExpiry.getHours() + lockHours);
      
      const { data: lockData, error: lockError } = await supabase
        .from('application_locks')
        .insert({
          application_id: appId,
          dealer_id: dealerId,
          lock_type: 'purchase_lock',
          expires_at: lockExpiry.toISOString(),
          is_paid: true,
          payment_id: session.id,
          payment_amount: 0 // No extra charge for the initial lock
        })
        .select()
        .single();
      
      if (lockError) {
        console.error(`Error creating lock for ${appId}:`, lockError);
      } else {
        console.log(`Successfully created lock: ${lockData.id}, expires: ${lockExpiry.toISOString()}`);
      }
    } catch (error) {
      console.error(`Error processing application ${appId}:`, error);
    }
  }
}
