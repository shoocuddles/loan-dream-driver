
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  subject: string;
  body: string;
}

interface LogRequest {
  minutes?: number;
}

serve(async (req) => {
  console.log("Received request to send-test-email function");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get the URL to check if it's a logs request
  const url = new URL(req.url);
  if (url.pathname.endsWith('/logs')) {
    return handleLogsRequest(req, url);
  }

  // Regular email sending request
  return handleEmailRequest(req);
});

async function handleLogsRequest(req: Request, url: URL) {
  console.log("Handling logs request");
  
  try {
    const minutes = parseInt(url.searchParams.get('minutes') || '5');
    
    // This is a simplified implementation since we don't have direct access to Deno logs
    // In a real production environment, you'd retrieve actual logs from a logging system
    
    // Get logs from the last 5 minutes (most recent first)
    const currentTime = Date.now();
    const fiveMinutesAgo = currentTime - (minutes * 60 * 1000);
    
    // Format timestamp in microseconds as Supabase logs use
    const logs = [
      {
        function_id: '6fc74bdd-22d9-4cc0-8751-9400bf63c307',
        timestamp: currentTime * 1000, // Convert to microseconds
        event_message: "Log retrieval successful",
      }
    ];
    
    return new Response(
      JSON.stringify({
        success: true,
        data: logs
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error handling logs request:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}

async function handleEmailRequest(req: Request) {
  console.log("Handling email sending request");
  
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      
      console.error(`Missing environment variables: ${missingVars.join(', ')}`);
      throw new Error(`Missing Supabase configuration: ${missingVars.join(', ')}`);
    }
    
    console.log("Supabase URL available:", !!supabaseUrl);
    console.log("Supabase service key available:", !!supabaseServiceKey);
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized");

    // Get the email settings
    console.log("Fetching mailgun settings from database");
    const { data: mailgunSettings, error: settingsError } = await supabaseClient
      .from('mailgun_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching mailgun settings:", settingsError);
      throw new Error(`Mailgun settings error: ${settingsError.message}`);
    }

    if (!mailgunSettings) {
      console.error("No mailgun settings found in database");
      throw new Error('Mailgun settings not configured');
    }
    
    console.log("Retrieved mailgun settings successfully:", {
      fromEmail: mailgunSettings.from_email,
      fromName: mailgunSettings.from_name
    });

    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (error) {
      console.error("Failed to parse request body:", error);
      throw new Error(`Invalid request body: ${error.message}`);
    }
    
    const { to, subject, body }: TestEmailRequest = requestBody;
    
    if (!to || !subject) {
      console.error("Missing required fields:", { to: !!to, subject: !!subject });
      throw new Error('Missing required fields: to and subject are required');
    }

    console.log(`Sending test email to: ${to}, subject: ${subject}`);
    
    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY environment variable");
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    
    console.log("Resend API key available:", !!resendApiKey);
    
    // Create HTML email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          ${subject}
        </h2>
        <div style="line-height: 1.5; color: #333;">
          ${body.replace(/\n/g, '<br>')}
        </div>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
          <p>This is a test email sent from the Ontario Loans system.</p>
          <p>If you received this email in error, please ignore it.</p>
        </div>
      </div>
    `;

    try {
      // Send email using Resend
      console.log("Initializing Resend with API key");
      const resend = new Resend(resendApiKey);
      
      console.log("Sending email with Resend");
      const fromAddress = `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`;
      console.log(`Email will be sent from: ${fromAddress}`);
      
      const sendResult = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: subject,
        html: emailHtml
      });
      
      console.log("Email send complete, result:", JSON.stringify(sendResult));
      
      if (sendResult.error) {
        console.error("Resend API returned error:", sendResult.error);
        throw new Error(`Failed to send email: ${sendResult.error.message}`);
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Test email sent successfully',
        data: sendResult.data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (sendError) {
      console.error("Error during Resend API call:", sendError);
      throw new Error(`Resend API error: ${sendError.message}`);
    }

  } catch (error) {
    console.error('Test email error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stackTrace: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}
