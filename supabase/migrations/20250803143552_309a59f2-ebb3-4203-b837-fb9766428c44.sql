-- Add missing RLS policies for availability_slots and integrations tables

-- RLS Policies for availability_slots table
CREATE POLICY "Users can view their own availability"
ON public.availability_slots
FOR SELECT
USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can create their own availability"
ON public.availability_slots
FOR INSERT
WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Users can update their own availability"
ON public.availability_slots
FOR UPDATE
USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can delete their own availability"
ON public.availability_slots
FOR DELETE
USING (user_id = public.get_current_user_id());

-- RLS Policies for integrations table
CREATE POLICY "Users can view their own integrations"
ON public.integrations
FOR SELECT
USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can create their own integrations"
ON public.integrations
FOR INSERT
WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Users can update their own integrations"
ON public.integrations
FOR UPDATE
USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can delete their own integrations"
ON public.integrations
FOR DELETE
USING (user_id = public.get_current_user_id());