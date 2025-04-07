
-- Create function to get column metadata for applications table
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
