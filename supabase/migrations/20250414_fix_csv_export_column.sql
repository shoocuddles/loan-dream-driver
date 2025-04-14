
-- Update the export_applications_as_csv function to properly handle column access
CREATE OR REPLACE FUNCTION public.export_applications_as_csv(app_ids uuid[])
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result text := '';
    header text := '';
    row_data record;
    col_names text[];
    col_values text[];
    i integer;
    app_id uuid;
BEGIN
    -- Get column names dynamically (excluding internal columns)
    SELECT array_agg(column_name::text ORDER BY ordinal_position)
    INTO col_names
    FROM information_schema.columns
    WHERE table_name = 'applications' 
    AND table_schema = 'public'
    AND column_name NOT IN ('created_at_copy', 'updated_at_copy', 'temp_status');

    -- Create header row
    header := array_to_string(col_names, ',');
    result := header || E'\n';
    
    -- Process each application ID separately
    FOREACH app_id IN ARRAY app_ids
    LOOP
        -- Get the application data as a record
        EXECUTE 'SELECT * FROM applications WHERE id = $1' INTO row_data USING app_id;
        
        -- Skip if no record found
        CONTINUE WHEN row_data IS NULL;
        
        -- Initialize values array
        col_values := array_fill(''::text, ARRAY[array_length(col_names, 1)]);
        
        -- Process each column
        FOR i IN 1..array_length(col_names, 1) LOOP
            DECLARE
                col_name text := col_names[i];
                col_value text;
            BEGIN
                -- Get the column value as text using dynamic SQL with column name
                EXECUTE format('SELECT ($1.%I)::text', col_name)
                INTO col_value
                USING row_data;
                
                -- Handle NULL values
                IF col_value IS NULL THEN
                    col_value := '';
                END IF;
                
                -- Escape values containing commas or newlines
                IF col_value ~ '[,\n]' OR position('"' in col_value) > 0 THEN
                    -- Replace double quotes with two double quotes for CSV escaping
                    col_value := replace(col_value, '"', '""');
                    -- Wrap in double quotes
                    col_value := '"' || col_value || '"';
                END IF;
                
                -- Store the value in the array
                col_values[i] := col_value;
            END;
        END LOOP;
        
        -- Add row to result
        result := result || array_to_string(col_values, ',') || E'\n';
    END LOOP;
    
    RETURN result;
END;
$function$;

-- Reset the check_csv_export_function to make sure it returns the correct status
CREATE OR REPLACE FUNCTION public.check_csv_export_function()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    func_exists boolean;
    test_result text;
    test_app_id uuid;
BEGIN
    -- Check if the function exists
    SELECT EXISTS(
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'export_applications_as_csv'
    ) INTO func_exists;
    
    IF NOT func_exists THEN
        RETURN false;
    END IF;
    
    -- Get the first application ID for testing
    SELECT id INTO test_app_id FROM applications LIMIT 1;
    
    -- Test the function with the application ID
    BEGIN
        EXECUTE 'SELECT export_applications_as_csv(ARRAY[$1])' INTO test_result USING test_app_id;
        
        -- If function worked and returned data, function is working
        RETURN test_result IS NOT NULL AND length(test_result) > 10;
    EXCEPTION WHEN OTHERS THEN
        -- Function failed, return false
        RETURN false;
    END;
END;
$function$;
