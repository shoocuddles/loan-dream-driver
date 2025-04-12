
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
    
    // Get dealer's email from user_profiles
    const { data: dealer, error: dealerError } = await supabase
      .from('user_profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (dealerError) {
      console.error("Error fetching dealer profile:", dealerError);
      return new Response(
        JSON.stringify({ error: "Dealer profile not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Check if we already have a saved Stripe customer ID
    let customerId = dealer.stripe_customer_id;
    
    if (!customerId) {
      // Find customer by email
      const customers = await stripe.customers.list({ 
        email: dealer.email,
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        
        // Update the user_profiles table with stripe_customer_id for future use
        try {
          await supabase.rpc('add_stripe_customer_id_if_missing', { 
            p_user_id: user.id, 
            p_customer_id: customerId 
          });
        } catch (updateError) {
          // Continue even if update fails
          console.log("Could not update stripe_customer_id in user_profiles:", updateError);
        }
      } else {
        // No Stripe customer found for this email
        return new Response(
          JSON.stringify({ 
            invoices: [],
            message: "No Stripe customer found with this email address"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    if (!customerId) {
      return new Response(
        JSON.stringify({ 
          invoices: [],
          message: "No Stripe customer ID associated with this account"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Also get invoices from our database - these are the ones we've permanently stored
    const { data: savedInvoices, error: savedInvoicesError } = await supabase
      .from('dealer_invoices')
      .select('*')
      .eq('dealer_id', user.id);
    
    if (savedInvoicesError) {
      console.error("Error fetching saved invoices:", savedInvoicesError);
    }
    
    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
      expand: ['data.charge']
    });
    
    // Also fetch Stripe charges (we need those for older entries that don't have invoices)
    const charges = await stripe.charges.list({
      customer: customerId,
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
        
        // Create the invoice object
        const invoiceObject = {
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
        
        // Store the invoice permanently in our database
        await storeInvoiceInDatabase(supabase, user.id, invoiceObject);
        
        return invoiceObject;
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
        
        // Create the charge object as an invoice-like structure
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
    let combinedData = [...invoiceData, ...chargeData];
    
    // Add saved invoices from our database if they're not already in the list
    if (savedInvoices && Array.isArray(savedInvoices)) {
      const savedInvoicesFormatted = savedInvoices.map(si => ({
        id: si.stripe_invoice_id,
        number: si.invoice_number,
        created: si.created_at ? new Date(si.created_at).getTime() / 1000 : 0,
        status: si.status || 'paid',
        total: si.amount || 0,
        currency: si.currency || 'cad',
        invoice_pdf: si.invoice_pdf_url,
        hosted_invoice_url: si.hosted_invoice_url,
        application_ids: si.application_ids ? si.application_ids.split(',') : undefined
      }));
      
      // Add saved invoices that aren't already in the list
      savedInvoicesFormatted.forEach(savedInvoice => {
        if (!combinedData.some(invoice => invoice.id === savedInvoice.id)) {
          combinedData.push(savedInvoice);
        }
      });
    }
    
    // Sort by created date (newest first)
    combinedData = combinedData.sort((a, b) => b.created - a.created);
    
    return new Response(
      JSON.stringify({ 
        invoices: combinedData,
        customer_id: customerId
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

// Helper function to store invoice in database
async function storeInvoiceInDatabase(supabase, dealerId: string, invoice: any) {
  try {
    const { data, error } = await supabase
      .from('dealer_invoices')
      .upsert({
        dealer_id: dealerId,
        stripe_invoice_id: invoice.id,
        invoice_number: invoice.number,
        amount: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        invoice_pdf_url: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        application_ids: invoice.application_ids ? invoice.application_ids.join(',') : null,
        created_at: new Date(invoice.created * 1000).toISOString(),
      }, { onConflict: 'stripe_invoice_id' })
      .select();
      
    if (error) {
      console.error("Error storing invoice in database:", error);
    } else {
      console.log("Successfully stored/updated invoice:", invoice.id);
    }
  } catch (error) {
    console.error("Exception storing invoice in database:", error);
  }
}
