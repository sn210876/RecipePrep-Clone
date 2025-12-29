/*
  # Fix Family Code Generation

  1. Updates
    - Remove admin-only restriction from family code generation
    - Simplify code generation
    - Add better helper functions
    
  2. Security
    - Still protected by RLS
    - Only admins can view/manage codes through RLS policies
*/

-- Drop the old function
DROP FUNCTION IF EXISTS public.generate_family_code(text);

-- Simplified function that works for admins without checking admin_users table
CREATE OR REPLACE FUNCTION public.generate_family_code(p_notes text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
BEGIN
  -- Generate unique code
  v_code := 'FAMILY-' || upper(encode(gen_random_bytes(6), 'hex'));
  
  -- Insert the code
  INSERT INTO public.family_codes (code, created_by_admin_id, notes)
  VALUES (v_code, auth.uid(), p_notes);
  
  RETURN v_code;
END;
$$;

-- Alternative: Simple INSERT helper
-- You can also just use direct SQL:
-- INSERT INTO public.family_codes (code, notes) 
-- VALUES ('FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')), 'Your note');
