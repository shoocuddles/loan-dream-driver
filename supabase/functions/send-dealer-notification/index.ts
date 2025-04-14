
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

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
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Fetch Mailgun settings
    const { data: mailgunSettings, error: settingsError } = await supabaseClient
      .from('mailgun_settings')
      .select('*')
      .single();

    if (settingsError || !mailgunSettings) {
      throw new Error('Mailgun settings not configured');
    }

    // Check for new applications to notify
    const { data: applications, error: applicationsError } = await supabaseClient
      .rpc('get_new_applications_for_notification');

    if (applicationsError) {
      throw new Error('Error fetching new applications');
    }

    // Fetch dealers who want email notifications
    const { data: dealers, error: dealersError } = await supabaseClient
      .from('user_profiles')
      .select('id, email')
      .eq('email_notifications', true)
      .eq('role', 'dealer');

    if (dealersError) {
      throw new Error('Error fetching dealers');
    }

    // Send emails to each dealer for new applications
    for (const dealer of dealers) {
      for (const app of applications) {
        // Create a beautiful HTML email
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="color: #2c3e50; text-align: center;">New Vehicle Loan Application</h1>
              <p style="color: #34495e;">A new vehicle loan application has been received:</p>
              <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px;">
                <p><strong>Name:</strong> ${app.fullname}</p>
                <p><strong>City:</strong> ${app.city || 'Not Specified'}</p>
                <p><strong>Vehicle Type:</strong> ${app.vehicletype || 'Not Specified'}</p>
                <p><strong>Application Date:</strong> ${new Date(app.created_at).toLocaleDateString()}</p>
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

        // Send email using Resend (replace with Mailgun when possible)
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        const result = await resend.emails.send({
          from: `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`,
          to: [dealer.email],
          subject: 'New Vehicle Loan Application Received',
          html: emailHtml
        });

        // Record notification
        await supabaseClient
          .from('application_notifications')
          .insert({
            application_id: app.id,
            email_sent: result.error === null
          });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
