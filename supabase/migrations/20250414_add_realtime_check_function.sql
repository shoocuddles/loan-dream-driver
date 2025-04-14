
-- Function to check if a table has realtime enabled
CREATE OR REPLACE FUNCTION public.is_realtime_enabled_for_table(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  -- Check if table is in the supabase_realtime publication
  SELECT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = table_name
  ) INTO is_enabled;
  
  RETURN is_enabled;
END;
$$;

-- Ensure the applications table is in the realtime publication
INSERT INTO pg_publication_tables (pubname, schemaname, tablename)
SELECT 'supabase_realtime', 'public', 'applications'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename = 'applications'
);

-- Set proper replica identity for the applications table
ALTER TABLE public.applications REPLICA IDENTITY FULL;
