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
      
      // Check if this is a lock payment or a purchase payment
      const isLockPayment = session.metadata?.is_lock_payment === 'true';
      const lockType = session.metadata?.lock_type;
      
      // Handle lock payments
      if (isLockPayment && lockType) {
        console.log(`Processing lock payment for ${applicationIds.length} applications, lock type: ${lockType}`);
        
        const timestamp = new Date().toISOString();
        const unitFee = parseFloat(session.metadata?.lock_fee || "0");
        let lockSuccessCount = 0;
        
        // Calculate lock expiration based on lock type
        let expiryHours = 24; // Default to 24 hours
        let isPermanent = false;
        
        if (lockType === 'permanent') {
          isPermanent = true;
          expiryHours = 87600; // 10 years
        } else if (lockType === '1week') {
          expiryHours = 168; // 7 days
        }
        
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiryHours);
        
        for (const appId of applicationIds) {
          try {
            // Remove any existing locks from the dealer
            const { data: existingLocks } = await supabase
              .from('application_locks')
              .select('id')
              .eq('application_id', appId)
              .eq('dealer_id', dealerId)
              .gt('expires_at', timestamp);
              
            if (existingLocks && existingLocks.length > 0) {
              console.log(`Updating ${existingLocks.length} existing locks for application ${appId}`);
              
              for (const lock of existingLocks) {
                await supabase
                  .from('application_locks')
                  .update({ expires_at: timestamp })
                  .eq('id', lock.id);
              }
            }
            
            // Create a new lock
            const { error: lockError } = await supabase
              .from('application_locks')
              .insert({
                application_id: appId,
                dealer_id: dealerId,
                lock_type: isPermanent ? 'permanent' : lockType,
                expires_at: expiryDate.toISOString(),
                is_paid: true,
                payment_id: sessionId,
                payment_amount: unitFee
              });
              
            if (lockError) {
              console.error(`Error creating lock for application ${appId}:`, lockError);
              continue;
            }
            
            // If permanent lock, mark the application as unavailable to other dealers
            if (isPermanent) {
              await supabase.rpc('mark_application_permanently_locked', {
                p_application_id: appId
              }).catch(err => {
                console.error('Error marking application as permanently locked:', err);
              });
            }
            
            lockSuccessCount++;
          } catch (error) {
            console.error(`Error processing lock for application ${appId}:`, error);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true,
            isLockPayment: true,
            locksProcessed: lockSuccessCount,
            message: `Successfully locked ${lockSuccessCount} of ${applicationIds.length} applications`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Handle regular purchases
      // Record purchases in the database
      const timestamp = new Date().toISOString();
      let allSuccessful = true;
      console.log(`Processing purchased applications for dealer ${dealerId}, count: ${applicationIds.length}`);
      
      // Prepare discount information if available
      const discountApplied = session.metadata?.has_discount === 'true';
      const discountType = session.metadata?.discount_type || (discountApplied ? 'age_discount' : undefined);
      const discountAmount = session.metadata?.discount_amount ? 
        parseFloat(session.metadata.discount_amount) : undefined;
      const unitPrice = parseFloat(session.metadata?.unit_price || "0");
      
      for (const appId of applicationIds) {
        try {
          // Check if application is already purchased
          const { data: existingPurchase, error: checkError } = await supabase
            .from('dealer_purchases')
            .select('id')
            .eq('dealer_id', dealerId)
            .eq('application_id', appId)
            .eq('is_active', true)
            .maybeSingle();
          
          if (checkError) {
            console.error(`Error checking existing purchase for application ${appId}:`, checkError);
          }
          
          // Only create a new purchase if one doesn't exist
          if (!existingPurchase) {
            // Record purchase in dealer_purchases table
            const { data: purchaseData, error: purchaseError } = await supabase
              .from('dealer_purchases')
              .insert({
                dealer_id: dealerId,
                application_id: appId,
                payment_id: sessionId,
                payment_amount: unitPrice,
                stripe_session_id: sessionId,
                stripe_customer_id: session.customer,
                discount_applied: discountApplied,
                discount_type: discountType,
                discount_amount: discountAmount,
                purchase_date: timestamp,
                is_active: true
              })
              .select()
              .single();
            
            if (purchaseError) {
              console.error(`Error recording purchase for application ${appId}:`, purchaseError);
              allSuccessful = false;
              continue;
            }
            
            console.log(`New purchase recorded for application ${appId}`);
          } else {
            console.log(`Application ${appId} already purchased by dealer ${dealerId}`);
          }
          
          // Create 24-hour lock for the application
          const lockExpiry = new Date();
          lockExpiry.setHours(lockExpiry.getHours() + 24);
          
          // Remove any existing locks from other dealers
          const { data: existingLocks } = await supabase
            .from('application_locks')
            .select('*')
            .eq('application_id', appId)
            .gt('expires_at', timestamp);
            
          if (existingLocks && existingLocks.length > 0) {
            // Log summary instead of every lock
            console.log(`Removing ${existingLocks.length} existing locks for application ${appId}`);
            
            for (const lock of existingLocks) {
              if (lock.dealer_id !== dealerId) {
                await supabase
                  .from('application_locks')
                  .update({ expires_at: timestamp })
                  .eq('id', lock.id);
              }
            }
          }
          
          // Create a new lock unless the dealer already has one
          const { data: dealerLock } = await supabase
            .from('application_locks')
            .select('*')
            .eq('application_id', appId)
            .eq('dealer_id', dealerId)
            .gt('expires_at', timestamp)
            .maybeSingle();
            
          if (!dealerLock) {
            console.log(`Creating purchase lock for application ${appId}`);
            
            const { error: lockError } = await supabase
              .from('application_locks')
              .insert({
                application_id: appId,
                dealer_id: dealerId,
                lock_type: 'purchase_lock',
                expires_at: lockExpiry.toISOString(),
                is_paid: true,
                payment_id: sessionId,
                payment_amount: 0
              });
              
            if (lockError) {
              console.error(`Error creating lock for application ${appId}:`, lockError);
            }
          }
        } catch (error) {
          console.error(`Error processing purchase for application ${appId}:`, error);
          allSuccessful = false;
        }
      }
      
      console.log(`Completed processing ${applicationIds.length} applications for dealer ${dealerId}`);
      
      return new Response(
        JSON.stringify({ 
          success: allSuccessful,
          message: allSuccessful ? "Purchases recorded successfully" : "Some purchases could not be recorded"
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
