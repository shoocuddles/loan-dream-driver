
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  subject: string;
  body: string;
  useDirectMailgun?: boolean;
}

interface LogRequest {
  minutes?: number;
}

// Store recent logs in memory for debugging
const recentLogs: Array<{timestamp: number, level: string, message: string}> = [];

// Enhanced logging function
function log(level: 'info' | 'error' | 'warn', message: string, data?: any) {
  const logEntry = {
    timestamp: Date.now(),
    level,
    message: data ? `${message}: ${JSON.stringify(data)}` : message
  };
  
  recentLogs.push(logEntry);
  // Limit log size
  if (recentLogs.length > 100) {
    recentLogs.shift();
  }
  
  // Also log to console
  if (level === 'error') {
    console.error(message, data);
  } else if (level === 'warn') {
    console.warn(message, data);
  } else {
    console.log(message, data);
  }
}

serve(async (req) => {
  log('info', "Received request to send-test-email function");
  
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
  try {
    return await handleEmailRequest(req);
  } catch (error) {
    log('error', 'Uncaught exception in request handler', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stackTrace: error.stack,
        detailedLogs: recentLogs.slice(-10) // Include last 10 logs in the response
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function handleLogsRequest(req: Request, url: URL) {
  log('info', "Handling logs request");
  
  try {
    const minutes = parseInt(url.searchParams.get('minutes') || '5');
    
    // Get logs from the last X minutes (from memory)
    const currentTime = Date.now();
    const cutoffTime = currentTime - (minutes * 60 * 1000);
    
    const filteredLogs = recentLogs
      .filter(entry => entry.timestamp >= cutoffTime)
      .map(entry => ({
        function_id: '6fc74bdd-22d9-4cc0-8751-9400bf63c307',
        timestamp: entry.timestamp * 1000, // Convert to microseconds for compatibility
        event_message: `[${entry.level.toUpperCase()}] ${entry.message}`,
      }));
    
    return new Response(
      JSON.stringify({
        success: true,
        data: filteredLogs
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log('error', 'Error handling logs request:', error);
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

async function sendEmailWithMailgun(to: string, subject: string, html: string, mailgunSettings: any, useDirectMailgun = false) {
  log('info', "Sending email with Mailgun");

  // Validate Mailgun settings
  if (!mailgunSettings.api_key || !mailgunSettings.domain) {
    throw new Error('Missing required Mailgun settings: API key or domain');
  }

  const fromAddress = `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`;
  log('info', `Email will be sent from: ${fromAddress}`);
  
  // For direct Mailgun test, use the hardcoded values as in the provided C# code
  if (useDirectMailgun) {
    to = "6352910@gmail.com";
    subject = "Hello Ian V";
    html = "Congratulations Ian V, you just sent an email with Mailgun! You are truly awesome!";
    log('info', "Using direct Mailgun test values");
  }

  // Construct the URL for the Mailgun API request
  const domain = mailgunSettings.domain;
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  
  log('info', `Using Mailgun API URL: ${url}`);

  // Create form data
  const formData = new FormData();
  formData.append('from', fromAddress);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);

  // Set up authorization headers for Mailgun
  const apiKey = mailgunSettings.api_key;
  const authHeader = `Basic ${btoa(`api:${apiKey}`)}`;

  try {
    log('info', "Sending HTTP request to Mailgun API");

    // Make the request to Mailgun
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData
    });

    log('info', `Mailgun API response status: ${response.status}`);

    // Parse the response
    const responseBody = await response.json();
    log('info', "Mailgun API response body:", responseBody);
    
    if (!response.ok) {
      log('error', "Mailgun API error", { status: response.status, response: responseBody });
      throw new Error(`Mailgun API error: ${responseBody.message || 'Unknown error'}`);
    }
    
    return responseBody;
  } catch (error) {
    log('error', "Error sending email with Mailgun", error);
    throw error;
  }
}

async function handleEmailRequest(req: Request) {
  log('info', "Handling email sending request");
  
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      
      log('error', `Missing environment variables: ${missingVars.join(', ')}`);
      throw new Error(`Missing Supabase configuration: ${missingVars.join(', ')}`);
    }
    
    log('info', "Supabase URL and key available");
    
    // Create Supabase client with detailed error handling
    let supabaseClient;
    try {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      log('info', "Supabase client initialized");
    } catch (error) {
      log('error', "Failed to initialize Supabase client", error);
      throw new Error(`Supabase client initialization error: ${error.message}`);
    }

    // Get the email settings with detailed error handling
    log('info', "Fetching mailgun settings from database");
    let mailgunSettings;
    try {
      const { data, error } = await supabaseClient
        .from('mailgun_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        log('error', "Error fetching mailgun settings:", error);
        throw new Error(`Mailgun settings error: ${error.message}`);
      }

      if (!data) {
        log('error', "No mailgun settings found in database");
        throw new Error('Mailgun settings not configured');
      }
      
      mailgunSettings = data;
      log('info', "Retrieved mailgun settings successfully", {
        fromEmail: mailgunSettings.from_email,
        fromName: mailgunSettings.from_name,
        domain: mailgunSettings.domain
      });
    } catch (error) {
      if (error.message.includes('Mailgun settings')) {
        throw error; // Re-throw our custom error
      }
      log('error', "Failed to fetch mailgun settings", error);
      throw new Error(`Database query error: ${error.message}`);
    }

    // Parse the request body with detailed error handling
    let requestBody, to, subject, body, useDirectMailgun;
    try {
      requestBody = await req.json();
      log('info', "Request body parsed successfully", { body: !!requestBody });
      
      to = requestBody.to;
      subject = requestBody.subject;
      body = requestBody.body;
      useDirectMailgun = !!requestBody.useDirectMailgun;
      
      if (!useDirectMailgun && (!to || !subject)) {
        log('error', "Missing required fields", { to: !!to, subject: !!subject });
        throw new Error('Missing required fields: to and subject are required');
      }

      log('info', `Sending test email to: ${to}, subject: ${subject}, direct mode: ${useDirectMailgun}`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        log('error', "Failed to parse request body as JSON", error);
        throw new Error(`Invalid request body: JSON parsing error - ${error.message}`);
      }
      if (error.message.includes('Missing required fields')) {
        throw error; // Re-throw our custom error
      }
      log('error', "Error processing request body", error);
      throw new Error(`Request processing error: ${error.message}`);
    }
    
    // Create HTML email content
    const emailHtml = useDirectMailgun ? "Direct Mailgun test message" : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          ${subject}
        </h2>
        <div style="line-height: 1.5; color: #333;">
          ${body?.replace(/\n/g, '<br>') || 'Test email body'}
        </div>
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
          <p>This is a test email sent from the Ontario Loans system.</p>
          <p>If you received this email in error, please ignore it.</p>
        </div>
      </div>
    `;

    // Send email using Mailgun with detailed error handling
    try {
      log('info', "Sending email with Mailgun");
      
      const sendResult = await sendEmailWithMailgun(
        to, 
        subject || 'Test Email', 
        emailHtml, 
        mailgunSettings,
        useDirectMailgun
      );
      
      log('info', "Email send complete, result:", sendResult);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Test email sent successfully',
        data: sendResult
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (error) {
      log('error', "Error during Mailgun API call", error);
      throw new Error(`Email sending error: ${error.message}`);
    }

  } catch (error) {
    log('error', 'Test email error:', error.message);
    log('error', 'Error stack:', error.stack);
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stackTrace: error.stack,
        logMessages: recentLogs
          .filter(entry => entry.level === 'error')
          .slice(-10)
          .map(entry => entry.message),
        fullLogs: recentLogs.slice(-20) // Include last 20 logs
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}
