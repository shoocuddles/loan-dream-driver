
-- Create a table for storing application batch purchase data
CREATE TABLE IF NOT EXISTS application_batch_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_ids TEXT[] NOT NULL,
  price_type TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_application_batch_purchases_dealer_id ON application_batch_purchases(dealer_id);

-- Enable Row Level Security
ALTER TABLE application_batch_purchases ENABLE ROW LEVEL SECURITY;

-- Create policy for system to read/write
CREATE POLICY "System can manage all batch purchases" 
ON application_batch_purchases 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Create policy for dealers to see their own batch purchases
CREATE POLICY "Dealers can view their own batch purchases" 
ON application_batch_purchases 
FOR SELECT 
TO authenticated
USING (dealer_id = auth.uid());
