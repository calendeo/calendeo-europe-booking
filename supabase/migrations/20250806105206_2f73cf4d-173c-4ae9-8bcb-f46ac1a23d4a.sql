-- Fix RLS policies for google_calendar_tokens to allow service role operations
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own tokens" ON public.google_calendar_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.google_calendar_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.google_calendar_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.google_calendar_tokens;

-- Create new policies that allow service role operations for OAuth callback
CREATE POLICY "Allow service role full access to tokens" 
ON public.google_calendar_tokens 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to view their own tokens
CREATE POLICY "Users can view their own tokens" 
ON public.google_calendar_tokens 
FOR SELECT 
TO authenticated 
USING ((auth.jwt() ->> 'email'::text) = email);

-- Allow authenticated users to delete their own tokens  
CREATE POLICY "Users can delete their own tokens"
ON public.google_calendar_tokens
FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = email);

-- Fix users table policy to allow service role updates
CREATE POLICY "Allow service role to update users"
ON public.users
FOR UPDATE  
TO service_role
USING (true)
WITH CHECK (true);