
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
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (dealerError) {
      console.error("Error fetching dealer profile:", dealerError);
      return new Response(
        JSON.stringify({ error: "Dealer profile not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Stripe customer ID is required to fetch invoices
    if (!dealer.stripe_customer_id) {
      return new Response(
        JSON.stringify({ 
          invoices: [],
          message: "No Stripe customer ID associated with this account"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Fetch invoices for the customer
    const invoices = await stripe.invoices.list({
      customer: dealer.stripe_customer_id,
      limit: 50,
      expand: ['data.charge']
    });
    
    // Also fetch Stripe charges (we need those for older entries that don't have invoices)
    const charges = await stripe.charges.list({
      customer: dealer.stripe_customer_id,
      limit: 50,
    });
    
    // Get invoice data with application details from checkout sessions
    const invoiceData = await Promise.all(
      invoices.data.map(async (invoice) => {
        // Try to retrieve checkout session if available
        let applicationIds: string[] = [];
        
        // If there's a charge attached to this invoice
        if (invoice.charge && typeof invoice.charge !== 'string') {
          const charge = invoice.charge;
          
          // Check for metadata on the charge
          if (charge.metadata && charge.metadata.checkout_session_id) {
            // Fetch the checkout session to get application IDs
            const session = await stripe.checkout.sessions.retrieve(
              charge.metadata.checkout_session_id
            );
            
            // Extract application IDs from session metadata
            if (session.metadata && session.metadata.application_ids) {
              applicationIds = session.metadata.application_ids.split(',');
            }
          }
        }
        
        return {
          id: invoice.id,
          number: invoice.number,
          created: invoice.created,
          status: invoice.status,
          total: invoice.total,
          currency: invoice.currency,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
          application_ids: applicationIds.length > 0 ? applicationIds : undefined
        };
      })
    );
    
    // Process charges that don't have invoices 
    const chargeData = charges.data
      .filter(charge => !invoiceData.some(inv => 
        inv.id === charge.invoice || 
        (charge.metadata && charge.metadata.invoice_id === inv.id)
      ))
      .map(charge => {
        // Try to extract application IDs from metadata
        let applicationIds: string[] = [];
        if (charge.metadata && charge.metadata.application_ids) {
          applicationIds = charge.metadata.application_ids.split(',');
        }
        
        return {
          id: charge.id,
          number: null, // Charges don't have invoice numbers
          created: charge.created,
          status: charge.status,
          total: charge.amount,
          currency: charge.currency,
          invoice_pdf: null, // Charges don't have PDFs
          hosted_invoice_url: charge.receipt_url,
          application_ids: applicationIds.length > 0 ? applicationIds : undefined
        };
      });
    
    // Combine invoice and charge data, sort by created date (newest first)
    const combinedData = [...invoiceData, ...chargeData]
      .sort((a, b) => b.created - a.created);
    
    return new Response(
      JSON.stringify({ 
        invoices: combinedData,
        customer_id: dealer.stripe_customer_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error retrieving invoices:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
