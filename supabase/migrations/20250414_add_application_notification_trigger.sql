
-- Create or replace a function that will be triggered when a new application is submitted
CREATE OR REPLACE FUNCTION public.trigger_dealer_notification()
RETURNS TRIGGER AS $$
DECLARE
  http_status INTEGER;
  http_content TEXT;
  edge_function_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  -- Only trigger for new submissions (when status changes to 'submitted')
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'submitted' AND (OLD.status <> 'submitted' OR OLD.status IS NULL)) THEN
    
    -- Get the anon key from server settings (securely)
    supabase_anon_key := current_setting('supabase.anon_key', true);
    
    -- Log the event clearly for debugging
    RAISE LOG 'Application submission detected: id=%, status=%, triggering dealer notification', NEW.id, NEW.status;
    
    -- Call the edge function using the pg_net extension with more detailed logging
    SELECT
      status, content INTO http_status, http_content
    FROM
      net.http_post(
        url := 'https://kgtfpuvksmqyaraijoal.supabase.co/functions/v1/send-dealer-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_anon_key
        ),
        body := jsonb_build_object(
          'application_id', NEW.id,
          'trigger_source', 'database_trigger'
        )
      );
    
    -- Log the HTTP response for debugging
    RAISE LOG 'Dealer notification HTTP call: status=%, response=%', http_status, http_content;
    
    -- Log the notification
    INSERT INTO public.application_notifications (application_id, email_sent) 
    VALUES (NEW.id, http_status BETWEEN 200 AND 299);
    
    RAISE LOG 'Dealer notification triggered for application %, HTTP status: %', NEW.id, http_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to avoid errors
DROP TRIGGER IF EXISTS application_notification_trigger ON public.applications;

-- Create the trigger on the applications table
CREATE TRIGGER application_notification_trigger
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_dealer_notification();

-- Grant necessary permissions for the pg_net extension
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, authenticated, service_role;

-- Make sure pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add index to improve performance of notification queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_application_notifications_app_id ON public.application_notifications(application_id);
