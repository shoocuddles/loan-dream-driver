
-- Create or replace a function that will be triggered when a new application is submitted
CREATE OR REPLACE FUNCTION public.trigger_dealer_notification()
RETURNS TRIGGER AS $$
DECLARE
  http_status INTEGER;
  http_content TEXT;
  edge_function_url TEXT;
BEGIN
  -- Only trigger for new submissions (when status changes to 'submitted')
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'submitted' AND (OLD.status <> 'submitted' OR OLD.status IS NULL)) THEN
    
    -- Call the edge function using the pg_net extension
    -- This allows asynchronous HTTP calls from the database
    PERFORM net.http_post(
      url := CASE 
        WHEN current_setting('server_version_num')::int >= 150000 -- This is for development vs production
        THEN 'https://kgtfpuvksmqyaraijoal.supabase.co/functions/v1/send-dealer-notification'
        ELSE 'https://kgtfpuvksmqyaraijoal.supabase.co/functions/v1/send-dealer-notification'
      END,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.anon_key', true)
      ),
      body := '{}'::jsonb
    );
    
    -- Log the notification
    INSERT INTO public.application_notifications (application_id, email_sent) 
    VALUES (NEW.id, false);
    
    RAISE LOG 'Dealer notification triggered for application %', NEW.id;
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
