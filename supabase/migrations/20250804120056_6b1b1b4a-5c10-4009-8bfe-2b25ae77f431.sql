-- Create user_integrations table for managing external integrations
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'zoom')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own integrations" 
ON public.user_integrations 
FOR SELECT 
USING (user_id = get_current_user_id());

CREATE POLICY "Users can create their own integrations" 
ON public.user_integrations 
FOR INSERT 
WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update their own integrations" 
ON public.user_integrations 
FOR UPDATE 
USING (user_id = get_current_user_id());

CREATE POLICY "Users can delete their own integrations" 
ON public.user_integrations 
FOR DELETE 
USING (user_id = get_current_user_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();