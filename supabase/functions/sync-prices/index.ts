
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
    // Get request body
    const { standardPrice, discountedPrice } = await req.json();
    
    if (!standardPrice || !discountedPrice) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Create or update products and prices in Stripe
    const standardPriceInCents = Math.round(standardPrice * 100);
    const discountedPriceInCents = Math.round(discountedPrice * 100);
    
    // Check if products already exist
    const products = await stripe.products.list({ active: true });
    
    let standardProduct = products.data.find(p => p.name === "Standard Application Download");
    let discountedProduct = products.data.find(p => p.name === "Discounted Application Download");
    
    // Create products if they don't exist
    if (!standardProduct) {
      standardProduct = await stripe.products.create({
        name: "Standard Application Download",
        description: "Initial application download at standard price",
      });
    }
    
    if (!discountedProduct) {
      discountedProduct = await stripe.products.create({
        name: "Discounted Application Download",
        description: "Discounted price after lock period expires",
      });
    }
    
    // Get active prices for the products
    const standardPrices = await stripe.prices.list({ 
      product: standardProduct.id, 
      active: true,
      limit: 1 
    });
    
    const discountedPrices = await stripe.prices.list({ 
      product: discountedProduct.id, 
      active: true,
      limit: 1 
    });
    
    // Deactivate existing prices if they don't match the new prices
    if (standardPrices.data.length > 0 && 
        standardPrices.data[0].unit_amount !== standardPriceInCents) {
      await stripe.prices.update(standardPrices.data[0].id, { active: false });
    }
    
    if (discountedPrices.data.length > 0 && 
        discountedPrices.data[0].unit_amount !== discountedPriceInCents) {
      await stripe.prices.update(discountedPrices.data[0].id, { active: false });
    }
    
    // Create new prices if needed
    const newStandardPrice = standardPrices.data.length === 0 || 
                             standardPrices.data[0].unit_amount !== standardPriceInCents
      ? await stripe.prices.create({
          product: standardProduct.id,
          unit_amount: standardPriceInCents,
          currency: "usd",
        })
      : standardPrices.data[0];
    
    const newDiscountedPrice = discountedPrices.data.length === 0 || 
                               discountedPrices.data[0].unit_amount !== discountedPriceInCents
      ? await stripe.prices.create({
          product: discountedProduct.id,
          unit_amount: discountedPriceInCents,
          currency: "usd",
        })
      : discountedPrices.data[0];
    
    // Store price IDs in Supabase for later use
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    await supabase.from('stripe_price_mappings').upsert([
      {
        type: 'standard',
        price_id: newStandardPrice.id,
        amount: standardPrice,
        stripe_amount: standardPriceInCents
      },
      {
        type: 'discounted',
        price_id: newDiscountedPrice.id,
        amount: discountedPrice,
        stripe_amount: discountedPriceInCents
      }
    ], { onConflict: 'type' });
    
    return new Response(
      JSON.stringify({ 
        success: true,
        standardPriceId: newStandardPrice.id,
        discountedPriceId: newDiscountedPrice.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing prices:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
