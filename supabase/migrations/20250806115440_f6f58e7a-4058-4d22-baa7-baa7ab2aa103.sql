-- Add unique constraint on email column for google_calendar_tokens table
-- This is required for the upsert operation (ON CONFLICT) in the google-oauth-callback edge function
ALTER TABLE public.google_calendar_tokens
ADD CONSTRAINT google_calendar_tokens_email_key UNIQUE (email);