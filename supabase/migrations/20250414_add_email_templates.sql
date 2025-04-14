
-- Create email_templates table to store customizable email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  html_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE public.email_templates IS 'Stores customizable email templates for various system notifications';

-- Add RLS policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can select templates
CREATE POLICY "Admins can view email templates" 
  ON public.email_templates 
  FOR SELECT 
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- Only admins can insert templates
CREATE POLICY "Admins can create email templates" 
  ON public.email_templates 
  FOR INSERT 
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- Only admins can update templates
CREATE POLICY "Admins can update email templates" 
  ON public.email_templates 
  FOR UPDATE 
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- Only admins can delete templates
CREATE POLICY "Admins can delete email templates" 
  ON public.email_templates 
  FOR DELETE 
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');

-- Add default template for dealer notification
INSERT INTO public.email_templates (type, html_content)
VALUES (
  'dealer_notification',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
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
  </div>'
) ON CONFLICT (type) DO NOTHING;
