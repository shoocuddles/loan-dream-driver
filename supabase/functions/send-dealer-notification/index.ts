
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function sendEmailWithMailgun(to: string, subject: string, html: string, mailgunSettings: any) {
  log('info', `Sending email with Mailgun to: ${to}`);

  // Validate Mailgun settings
  if (!mailgunSettings.api_key || !mailgunSettings.domain) {
    throw new Error('Missing required Mailgun settings: API key or domain');
  }

  const fromAddress = `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`;
  log('info', `Email will be sent from: ${fromAddress}`);
  
  // Construct the URL for the Mailgun API request
  const domain = mailgunSettings.domain;
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  
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
    log('info', `Making request to Mailgun API at ${url}`);
    
    // Make the request to Mailgun
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      log('error', "Mailgun API error", { status: response.status, response: responseData });
      throw new Error(`Mailgun API error: ${responseData.message || 'Unknown error'}`);
    }
    
    log('info', "Email sent successfully via Mailgun", responseData);
    return responseData;
  } catch (error) {
    log('error', "Error sending email with Mailgun", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', "Starting dealer notification function");
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      log('error', "Missing Supabase configuration");
      throw new Error('Missing Supabase configuration');
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

    // Get email template
    const { data: emailTemplate, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('type', 'dealer_notification')
      .single();

    if (templateError && templateError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which we can handle with the default template
      log('error', "Error fetching email template", templateError);
    }

    const emailBody = emailTemplate?.html_content || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #2c3e50; text-align: center;">New Vehicle Loan Application</h1>
          <p style="color: #34495e;">A new vehicle loan application has been received:</p>
          <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px;">
            <p><strong>Name:</strong> {{fullname}}</p>
            <p><strong>City:</strong> {{city}}</p>
            <p><strong>Vehicle Type:</strong> {{vehicletype}}</p>
            <p><strong>Application Date:</strong> {{application_date}}</p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://ontario-loans.com/dealers" style="
              display: inline-block; 
              background-color: #3498db; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold;
              transition: background-color 0.3s ease;
            ">View Application in Dashboard</a>
          </div>
        </div>
        <p style="text-align: center; color: #7f8c8d; margin-top: 20px;">
          You can manage email notifications in your dealer profile.
        </p>
      </div>
    `;

    log('info', "Fetching new applications that need notifications");
    
    // Check for new applications to notify
    const { data: applications, error: applicationsError } = await supabaseClient
      .rpc('get_new_applications_for_notification');

    if (applicationsError) {
      log('error', "Error fetching new applications", applicationsError);
      throw new Error('Error fetching new applications');
    }

    log('info', `Found ${applications?.length || 0} applications that need notifications`);

    // Fetch dealers who want email notifications
    const { data: dealers, error: dealersError } = await supabaseClient
      .from('user_profiles')
      .select('id, email')
      .eq('email_notifications', true)
      .eq('role', 'dealer');

    if (dealersError) {
      log('error', "Error fetching dealers", dealersError);
      throw new Error('Error fetching dealers');
    }

    log('info', `Found ${dealers?.length || 0} dealers with notifications enabled`);

    const results = [];
    let notificationsSuccessCount = 0;
    let notificationsErrorCount = 0;

    // Send emails to each dealer for new applications
    for (const dealer of dealers || []) {
      log('info', `Processing notifications for dealer: ${dealer.id}`);
      
      for (const app of applications || []) {
        log('info', `Sending notification for application ${app.id} to dealer ${dealer.id}`);
        
        // Format application date
        const appDate = new Date(app.created_at).toLocaleDateString();
        
        // Replace placeholders in the email template
        let personalizedHtml = emailBody
          .replace(/{{fullname}}/g, app.fullname || 'Not Specified')
          .replace(/{{city}}/g, app.city || 'Not Specified')
          .replace(/{{vehicletype}}/g, app.vehicletype || 'Not Specified')
          .replace(/{{application_date}}/g, appDate);

        try {
          // Send email using Mailgun
          await sendEmailWithMailgun(
            dealer.email,
            'New Vehicle Loan Application Received',
            personalizedHtml,
            mailgunSettings
          );

          // Record notification
          const { data: notification, error: notificationError } = await supabaseClient
            .from('application_notifications')
            .insert({
              application_id: app.id,
              email_sent: true
            });

          if (notificationError) {
            log('error', `Error recording notification for application ${app.id}`, notificationError);
            notificationsErrorCount++;
          } else {
            notificationsSuccessCount++;
          }

          results.push({
            dealer: dealer.email,
            application: app.id,
            success: true
          });
        } catch (error) {
          notificationsErrorCount++;
          log('error', `Failed to send notification to ${dealer.email} for application ${app.id}`, error);
          
          // Still record the attempt, but mark as not sent successfully
          try {
            await supabaseClient
              .from('application_notifications')
              .insert({
                application_id: app.id,
                email_sent: false
              });
          } catch (recordError) {
            log('error', `Error recording failed notification for application ${app.id}`, recordError);
          }
          
          results.push({
            dealer: dealer.email,
            application: app.id,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    log('info', `Notification process complete. Success: ${notificationsSuccessCount}, Errors: ${notificationsErrorCount}`);

    return new Response(JSON.stringify({ 
      success: true,
      results,
      applicationsProcessed: applications?.length || 0,
      dealersNotified: dealers?.length || 0,
      notificationsSuccessCount,
      notificationsErrorCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    log('error', 'Notification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        logs: recentLogs.slice(-20)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
