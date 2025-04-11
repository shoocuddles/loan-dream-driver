
-- UPDATE get_dealer_downloads function to properly join dealer_purchases with applications
CREATE OR REPLACE FUNCTION public.get_dealer_downloads(p_dealer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
DECLARE
  downloads_result JSONB := '[]';
  purchase RECORD;
  app RECORD;
BEGIN
  -- Get applications from dealer_purchases joined with applications
  FOR purchase IN
    SELECT p.*
    FROM public.dealer_purchases p
    WHERE p.dealer_id = p_dealer_id
    AND p.is_active = true
    ORDER BY p.purchase_date DESC
  LOOP
    -- Get application details - select ALL fields explicitly
    SELECT * INTO app
    FROM public.applications a
    WHERE a.id = purchase.application_id;
    
    IF FOUND THEN
      -- Build result with ALL fields from the application
      downloads_result := downloads_result || jsonb_build_object(
        'id', app.id,
        'purchaseId', purchase.id,
        'applicationId', app.id,
        'fullName', app.fullname,
        'phoneNumber', app.phonenumber,
        'email', app.email,
        'address', app.streetaddress,
        'city', app.city,
        'province', app.province,
        'postalCode', app.postalcode,
        'vehicleType', app.vehicletype,
        'downloadDate', purchase.downloaded_at,
        'purchaseDate', purchase.purchase_date,
        'paymentAmount', purchase.payment_amount,
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

-- Update is_application_downloaded_by_dealer to check in dealer_purchases
CREATE OR REPLACE FUNCTION public.is_application_downloaded_by_dealer(p_application_id uuid, p_dealer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.dealer_purchases
    WHERE application_id = p_application_id
      AND dealer_id = p_dealer_id
      AND is_active = true
  );
END;
$function$;
