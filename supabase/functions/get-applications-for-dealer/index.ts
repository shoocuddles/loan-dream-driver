
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    // Get the request data
    const { dealerId } = await req.json();
    
    if (!dealerId) {
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Missing dealer ID",
            details: "Dealer ID is required"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Fetching applications for dealer ${dealerId}`);
    
    // Get applications for dealer
    const { data, error } = await supabase.rpc('get_applications_for_dealer', {
      p_dealer_id: dealerId
    });
    
    if (error) {
      console.error("Error fetching applications:", error);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Failed to fetch applications",
            details: error.message
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Get purchased application IDs
    const { data: purchasedData, error: purchasedError } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true);
    
    if (purchasedError) {
      console.error("Error fetching purchased applications:", purchasedError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Failed to fetch purchased applications",
            details: purchasedError.message
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Get purchase counts for each application
    // Enhanced: Use no filter to get ALL purchases across all dealers
    const { data: allPurchasesData, error: allPurchasesError } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .eq('is_active', true);
    
    if (allPurchasesError) {
      console.error("Error fetching purchase counts:", allPurchasesError);
      return new Response(
        JSON.stringify({ 
          error: { 
            message: "Failed to fetch purchase counts",
            details: allPurchasesError.message
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Create purchase count map
    const purchaseCountMap: { [key: string]: number } = {};
    if (allPurchasesData && allPurchasesData.length > 0) {
      allPurchasesData.forEach(purchase => {
        const appId = purchase.application_id;
        purchaseCountMap[appId] = (purchaseCountMap[appId] || 0) + 1;
      });
      
      // Log sample counts for debugging
      console.log(`Created purchase count map with ${Object.keys(purchaseCountMap).length} entries`);
      
      // Log the first few entries for debugging
      const sampleKeys = Object.keys(purchaseCountMap).slice(0, 5);
      const sampleCounts = sampleKeys.reduce((obj, key) => {
        obj[key] = purchaseCountMap[key];
        return obj;
      }, {} as Record<string, number>);
      
      console.log("Sample purchase counts:", JSON.stringify(sampleCounts));
    }
    
    const purchasedIds = purchasedData.map(item => item.application_id);
    console.log(`Filtering out ${purchasedIds.length} purchased applications`);
    
    // Filter out purchased applications and add purchase counts
    const filteredData = data.filter(app => !purchasedIds.includes(app.applicationId)).map(app => {
      return {
        ...app,
        purchaseCount: purchaseCountMap[app.applicationId] || 0
      };
    });
    
    return new Response(
      JSON.stringify(filteredData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in get-applications-for-dealer function:", error);
    return new Response(
      JSON.stringify({ 
        error: { 
          message: "Server error",
          details: error.message
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
