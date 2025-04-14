
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the database configuration from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing Supabase environment variables' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { applicationIds } = await req.json();

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or empty applicationIds array' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Test the get_applications_csv function
    const { data: csvData, error } = await supabase.rpc('get_applications_csv', { 
      ids: applicationIds 
    });

    if (error) {
      console.error('Error from get_applications_csv:', error);
      
      // Check if the function exists
      const { data: functionCheck } = await supabase
        .from('pg_catalog.pg_proc')
        .select('proname')
        .eq('proname', 'get_applications_csv')
        .limit(1);

      return new Response(
        JSON.stringify({
          error: error.message,
          context: {
            applicationIds,
            functionExists: functionCheck && functionCheck.length > 0
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Check CSV data
    const csvDataInfo = {
      success: true,
      length: csvData ? csvData.length : 0,
      sample: csvData ? csvData.substring(0, 100) : '',
      applicationIds
    };

    // Return the CSV data info
    return new Response(
      JSON.stringify(csvDataInfo),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
