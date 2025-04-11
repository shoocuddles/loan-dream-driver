
-- First check if the column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

-- Create function to update the stripe_customer_id
CREATE OR REPLACE FUNCTION public.add_stripe_customer_id_if_missing(
  p_user_id uuid,
  p_customer_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the user_profiles table with the stripe_customer_id
  UPDATE public.user_profiles
  SET stripe_customer_id = p_customer_id
  WHERE id = p_user_id
    AND (stripe_customer_id IS NULL OR stripe_customer_id = '');
    
  RETURN TRUE;
END;
$$;
