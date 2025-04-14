
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@1.3.0";
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

    // Get the email settings
    const { data: mailgunSettings, error: settingsError } = await supabaseClient
      .from('mailgun_settings')
      .select('*')
      .single();

    if (settingsError || !mailgunSettings) {
      throw new Error('Mailgun settings not configured');
    }

    // Parse the request body
    const { to, subject, body }: TestEmailRequest = await req.json();
    
    if (!to || !subject) {
      throw new Error('Missing required fields: to and subject are required');
    }

    console.log(`Sending test email to: ${to}, subject: ${subject}`);
    
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
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const result = await resend.emails.send({
      from: `${mailgunSettings.from_name} <${mailgunSettings.from_email}>`,
      to: [to],
      subject: subject,
      html: emailHtml
    });
    
    console.log("Email send result:", result);

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
    console.error('Test email error:', error);
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
});
