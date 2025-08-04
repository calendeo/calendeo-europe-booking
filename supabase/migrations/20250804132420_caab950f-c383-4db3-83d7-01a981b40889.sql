-- Create google_calendar_tokens table
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tokens" 
ON public.google_calendar_tokens 
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can insert their own tokens" 
ON public.google_calendar_tokens 
FOR INSERT 
WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update their own tokens" 
ON public.google_calendar_tokens 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can delete their own tokens" 
ON public.google_calendar_tokens 
FOR DELETE 
USING (auth.jwt() ->> 'email' = email);