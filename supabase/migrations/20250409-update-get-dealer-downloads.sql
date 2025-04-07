
-- Update the get_dealer_downloads function to include ALL application fields
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

-- Also update the get_applications_columns function to return a proper result set
DROP FUNCTION IF EXISTS public.get_applications_columns();
CREATE OR REPLACE FUNCTION public.get_applications_columns()
 RETURNS SETOF information_schema.columns
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT *
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'applications'
  ORDER BY ordinal_position;
$function$;
