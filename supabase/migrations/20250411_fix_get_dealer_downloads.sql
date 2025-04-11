
-- Function to get downloaded applications for a dealer
CREATE OR REPLACE FUNCTION public.get_dealer_downloads(p_dealer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  downloads_result JSONB := '[]';
  download RECORD;
  app RECORD;
BEGIN
  FOR download IN
    SELECT d.*
    FROM public.application_downloads d
    WHERE d.dealer_id = p_dealer_id
    ORDER BY d.downloaded_at DESC
  LOOP
    -- Get application details - select ALL fields explicitly
    SELECT * INTO app
    FROM public.applications a
    WHERE a.id = download.application_id;
    
    IF FOUND THEN
      -- Build result with ALL fields from the application
      downloads_result := downloads_result || jsonb_build_object(
        'downloadId', download.id,
        'applicationId', app.id,
        'fullName', app.fullname,
        'phoneNumber', app.phonenumber,
        'email', app.email,
        'address', app.streetaddress,
        'city', app.city,
        'province', app.province,
        'postalCode', app.postalcode,
        'vehicleType', app.vehicletype,
        'downloadDate', download.downloaded_at,
        'paymentAmount', download.payment_amount,
        -- Include ALL other fields explicitly
        'requiredFeatures', app.requiredfeatures,
        'unwantedColors', app.unwantedcolors,
        'preferredMakeModel', app.preferredmakemodel,
        'hasExistingLoan', app.hasexistingloan,
        'currentVehicle', app.currentvehicle, 
        'currentPayment', app.currentpayment,
        'amountOwed', app.amountowed,
        'mileage', app.mileage,
        'employmentStatus', app.employmentstatus,
        'monthlyIncome', app.monthlyincome,
        'employerName', app.employer_name,
        'jobTitle', app.job_title,
        'employmentDuration', app.employment_duration,
        'additionalNotes', app.additionalnotes,
        'created_at', app.created_at,
        'updated_at', app.updated_at
      );
    END IF;
  END LOOP;
  
  RETURN downloads_result;
END;
$function$;

-- Function to check if an application has been downloaded by a dealer
CREATE OR REPLACE FUNCTION public.is_application_downloaded_by_dealer(p_application_id uuid, p_dealer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.application_downloads
    WHERE application_id = p_application_id
      AND dealer_id = p_dealer_id
  );
END;
$function$;

-- Update the get_applications_for_dealer function to properly check download status
CREATE OR REPLACE FUNCTION public.get_applications_for_dealer(p_dealer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  applications_result JSONB;
  app RECORD;
  app_list JSONB := '[]';
  lock_info JSONB;
  downloaded BOOLEAN;
  settings RECORD;
  display_name TEXT;
BEGIN
  -- Get system settings
  SELECT * INTO settings FROM public.system_settings LIMIT 1;

  -- Get all applications
  FOR app IN
    SELECT a.* 
    FROM public.applications a
    WHERE a.status = 'submitted'
  LOOP
    -- Check if application is locked
    lock_info := public.is_application_locked(app.id, p_dealer_id);
    
    -- If permanently locked by another dealer, skip this application
    -- UNLESS it's already downloaded by current dealer
    downloaded := public.is_application_downloaded_by_dealer(app.id, p_dealer_id);
    
    IF (lock_info->>'isLocked')::BOOLEAN = true AND 
       (lock_info->>'lockType') = 'permanent' AND
       (lock_info->>'isOwnLock')::BOOLEAN = false AND
       NOT downloaded THEN
      CONTINUE;
    END IF;
    
    -- Create a display name (first name + last initial)
    SELECT 
      CASE 
        WHEN position(' ' in app.fullname) > 0 
        THEN 
          split_part(app.fullname, ' ', 1) || ' ' || 
          substring(split_part(app.fullname, ' ', 2), 1, 1) || '.'
        ELSE 
          app.fullname
      END INTO display_name;

    -- Build application data with anonymized info
    app_list := app_list || jsonb_build_object(
      'id', app.id,
      'applicationId', app.id,
      'fullName', display_name,
      'city', app.city,
      'submissionDate', app.created_at,
      'status', app.status,
      'lockInfo', lock_info,
      'isDownloaded', downloaded,
      'standardPrice', settings.standard_price,
      'discountedPrice', settings.discounted_price,
      'vehicleType', COALESCE(app.vehicletype, 'N/A')
    );
  END LOOP;
  
  RETURN app_list;
END;
$function$;

-- Make sure payment_id column exists in application_downloads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'application_downloads' 
    AND column_name = 'payment_id'
  ) THEN
    ALTER TABLE public.application_downloads
    ADD COLUMN payment_id TEXT;
  END IF;
END $$;
