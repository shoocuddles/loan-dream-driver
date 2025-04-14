
-- Update the export_applications_as_csv function to properly format CSV data
CREATE OR REPLACE FUNCTION public.export_applications_as_csv(app_ids uuid[])
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result text := '';
    header text := '';
    app_row record;
    col_names text[];
    col_values text[];
    i integer;
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
    
    -- Process each application
    FOR app_row IN 
        SELECT *
        FROM applications
        WHERE id = ANY(app_ids)
    LOOP
        -- Initialize values array with the right size
        col_values := array_fill(''::text, ARRAY[array_length(col_names, 1)]);
        
        -- Fill values for each column
        FOR i IN 1..array_length(col_names, 1) LOOP
            -- Get the column value as text
            EXECUTE format('SELECT ($1.%I)::text', col_names[i])
            INTO col_values[i]
            USING app_row;
            
            -- Handle NULL values
            IF col_values[i] IS NULL THEN
                col_values[i] := '';
            END IF;
            
            -- Escape values containing commas or newlines
            IF col_values[i] ~ '[,\n]' THEN
                -- Replace double quotes with two double quotes for CSV escaping
                col_values[i] := replace(col_values[i], '"', '""');
                -- Wrap in double quotes
                col_values[i] := '"' || col_values[i] || '"';
            END IF;
        END LOOP;
        
        -- Add row to result
        result := result || array_to_string(col_values, ',') || E'\n';
    END LOOP;
    
    RETURN result;
END;
$function$;

-- Create a function to check if the export_applications_as_csv function exists and is correctly defined
CREATE OR REPLACE FUNCTION public.check_csv_export_function()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'export_applications_as_csv'
    ) INTO func_exists;
    
    RETURN func_exists;
END;
$function$;
