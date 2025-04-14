
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
    
    // This is where you'd typically fetch logs from a logging system
    // For this example, we'll just return a placeholder
    
    return new Response(
      JSON.stringify({
        success: true,
        data: [
          {
            function_id: '6fc74bdd-22d9-4cc0-8751-9400bf63c307',
            timestamp: Date.now() * 1000, // Convert to microseconds
            event_message: "Sample log entry for test-email function",
          },
          {
            function_id: '6fc74bdd-22d9-4cc0-8751-9400bf63c307',
            timestamp: (Date.now() - 60000) * 1000, // 1 minute ago
            event_message: "Sample log entry from 1 minute ago",
          }
        ]
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
      throw new Error('Missing Supabase configuration: URL or service role key');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized");

    // Get the email settings
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
      throw new Error('Mailgun settings not configured');
    }
    
    console.log("Retrieved mailgun settings successfully");

    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error(`Invalid request body: ${error.message}`);
    }
    
    const { to, subject, body }: TestEmailRequest = requestBody;
    
    if (!to || !subject) {
      throw new Error('Missing required fields: to and subject are required');
    }

    console.log(`Sending test email to: ${to}, subject: ${subject}`);
    
    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    
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

    // Send email using Resend (would be replaced with Mailgun in production)
    console.log("Initializing Resend with API key");
    const resend = new Resend(resendApiKey);
    
    console.log("Attempting to send email with Resend");
    const result = await resend.emails.send({
      from: `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`,
      to: [to],
      subject: subject,
      html: emailHtml
    });
    
    console.log("Email send result:", JSON.stringify(result));

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Test email sent successfully'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Test email error:', error.message, error.stack);
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
