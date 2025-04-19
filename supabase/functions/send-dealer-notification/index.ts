
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store recent logs in memory for debugging
const recentLogs: Array<{timestamp: number, level: string, message: string}> = [];

function log(level: 'info' | 'error' | 'warn', message: string, data?: any) {
  const logEntry = {
    timestamp: Date.now(),
    level,
    message: data ? `${message}: ${JSON.stringify(data)}` : message
  };
  
  recentLogs.push(logEntry);
  if (recentLogs.length > 100) recentLogs.shift();
  
  console.log(`[${level.toUpperCase()}] ${message}`, data || '');
}

async function sendEmailWithMailgun(to: string, subject: string, html: string, mailgunSettings: any) {
  try {
    log('info', `Preparing to send email to ${to}`);
    
    if (!mailgunSettings.api_key || !mailgunSettings.domain) {
      throw new Error('Missing required Mailgun settings');
    }

    const fromAddress = `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`;
    const url = `https://api.mailgun.net/v3/${mailgunSettings.domain}/messages`;
    const formData = new FormData();
    
    formData.append('from', fromAddress);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunSettings.api_key}`)}`
      },
      body: formData
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      log('error', "Mailgun API error", { status: response.status, response: responseData });
      throw new Error(`Mailgun API error: ${responseData.message || 'Unknown error'}`);
    }
    
    log('info', "Email sent successfully", responseData);
    return responseData;
  } catch (error) {
    log('error', "Failed to send email", error);
    throw error;
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', "Starting dealer notification function");
    
    // Parse request body
    let requestBody = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
        log('info', "Request body:", requestBody);
      }
    } catch (e) {
      log('warn', "Could not parse request body", e);
    }
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Fetch email template
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('html_content')
      .eq('type', 'dealer_notification')
      .single();

    if (templateError) {
      log('error', "Error fetching email template", templateError);
      throw new Error('Failed to fetch email template');
    }

    // Fetch Mailgun settings
    const { data: mailgunSettings, error: settingsError } = await supabaseClient
      .from('mailgun_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !mailgunSettings) {
      log('error', "Mailgun settings not configured", settingsError);
      throw new Error('Mailgun settings not configured');
    }

    // Get new applications that need notifications
    const { data: applications, error: appsError } = await supabaseClient
      .rpc('get_new_applications_for_notification');

    if (appsError) {
      log('error', "Error fetching applications", appsError);
      throw appsError;
    }

    log('info', `Found ${applications?.length || 0} applications needing notifications`);

    // Get dealers who want notifications
    const { data: dealers, error: dealersError } = await supabaseClient
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('email_notifications', true)
      .eq('role', 'dealer');

    if (dealersError) {
      log('error', "Error fetching dealers", dealersError);
      throw dealersError;
    }

    log('info', `Found ${dealers?.length || 0} dealers to notify`);

    const results = [];
    const emailTemplate = template?.html_content || '';

    // Send notifications for each application to each dealer
    for (const app of applications || []) {
      for (const dealer of dealers || []) {
        try {
          // Personalize email content
          let personalizedHtml = emailTemplate
            .replace(/{{fullname}}/g, app.fullname || 'Not specified')
            .replace(/{{city}}/g, app.city || 'Not specified')
            .replace(/{{vehicletype}}/g, app.vehicletype || 'Not specified')
            .replace(/{{application_date}}/g, formatDate(app.created_at));

          // Send email
          await sendEmailWithMailgun(
            dealer.email,
            'New Vehicle Loan Application',
            personalizedHtml,
            mailgunSettings
          );

          // Record notification
          const { error: notificationError } = await supabaseClient
            .from('application_notifications')
            .insert({
              application_id: app.id,
              email_sent: true
            });

          if (notificationError) {
            log('error', `Error recording notification for application ${app.id}`, notificationError);
            results.push({
              success: false,
              dealer: dealer.email,
              application: app.id,
              error: notificationError.message
            });
          } else {
            results.push({
              success: true,
              dealer: dealer.email,
              application: app.id
            });
          }
        } catch (error) {
          log('error', `Error processing notification for dealer ${dealer.email}`, error);
          results.push({
            success: false,
            dealer: dealer.email,
            application: app.id,
            error: error.message
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        applicationsProcessed: applications?.length || 0,
        dealersNotified: dealers?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    log('error', "Notification function error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        logs: recentLogs
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
