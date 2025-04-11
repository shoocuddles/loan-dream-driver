
-- Add function to get application by ID with proper permissions
CREATE OR REPLACE FUNCTION public.get_application_by_id(p_application_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
AS $function$
DECLARE
  application_result JSONB;
BEGIN
  SELECT json_build_object(
    'id', a.id,
    'fullname', a.fullname,
    'phonenumber', a.phonenumber,
    'email', a.email,
    'streetaddress', a.streetaddress,
    'city', a.city,
    'province', a.province,
    'postalcode', a.postalcode,
    'vehicletype', a.vehicletype,
    'requiredfeatures', a.requiredfeatures,
    'unwantedcolors', a.unwantedcolors,
    'preferredmakemodel', a.preferredmakemodel,
    'hasexistingloan', a.hasexistingloan,
    'currentvehicle', a.currentvehicle,
    'currentpayment', a.currentpayment,
    'amountowed', a.amountowed,
    'mileage', a.mileage,
    'employmentstatus', a.employmentstatus,
    'monthlyincome', a.monthlyincome,
    'employer_name', a.employer_name,
    'job_title', a.job_title,
    'employment_duration', a.employment_duration,
    'additionalnotes', a.additionalnotes,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  )::JSONB INTO application_result
  FROM public.applications a
  WHERE a.id = p_application_id;
  
  RETURN application_result;
END;
$function$;
