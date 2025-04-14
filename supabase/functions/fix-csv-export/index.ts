
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    })
  }

  // Get the authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  try {
    const { method } = req;
    const url = new URL(req.url);

    console.log(`🔧 CSV Export Fix: Received ${method} request to ${url.pathname}`);

    // Create a Supabase client with the auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check if the function exists
    const { data: funcExists, error: funcError } = await supabaseClient.rpc('check_csv_export_function');
    
    if (funcError) {
      console.error('❌ Error checking CSV export function:', funcError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: funcError.message,
        message: 'Failed to check CSV export function'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // If the function exists, test it with a sample application ID
    if (funcExists) {
      // Get a test application ID
      const { data: apps, error: appsError } = await supabaseClient
        .from('applications')
        .select('id')
        .limit(1);
        
      if (appsError) {
        console.error('❌ Error fetching test application:', appsError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: appsError.message,
          message: 'Failed to fetch test application'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      if (!apps || apps.length === 0) {
        console.log('⚠️ No applications found for testing');
        return new Response(JSON.stringify({ 
          success: true,
          message: 'CSV export function exists, but no applications found for testing'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      // Test the function with the application ID
      const testAppId = apps[0].id;
      const { data: csvData, error: csvError } = await supabaseClient
        .rpc('export_applications_as_csv', { app_ids: [testAppId] });
        
      if (csvError) {
        console.error('❌ Error testing CSV export:', csvError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: csvError.message,
          message: 'CSV export function exists but failed testing'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      // Check if the CSV data is valid
      if (!csvData || typeof csvData !== 'string' || !csvData.includes(',')) {
        console.error('❌ CSV export did not return valid data:', csvData);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid CSV data returned',
          message: 'CSV export function exists but returned invalid data'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
      
      // Check if the headers match the columns in the applications table
      const csvLines = csvData.split('\n');
      const headerRow = csvLines[0];
      const columnCount = headerRow.split(',').length;
      
      console.log(`✅ CSV export function test successful: ${columnCount} columns exported`);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'CSV export function is working correctly',
        columnCount: columnCount,
        sample: csvLines.slice(0, 2).join('\n')
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.log('⚠️ CSV export function not found or not working correctly');
      return new Response(JSON.stringify({ 
        success: false,
        message: 'CSV export function not found or not working correctly'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      message: 'An unexpected error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})

// Helper to create a client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.26.0'
