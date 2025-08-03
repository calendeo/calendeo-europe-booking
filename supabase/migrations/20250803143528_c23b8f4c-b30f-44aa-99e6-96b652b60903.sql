-- Add missing RLS policies for remaining tables

-- RLS Policies for availability_slots table (missing - it has no policies yet)
-- Users can manage their own availability was already created, but let me check table names

-- RLS Policies for integrations table (missing - it has no policies yet)
-- Users can manage their own integrations was already created

-- RLS Policies for analytics table (missing INSERT policy)
CREATE POLICY "Users can create their own analytics"
ON public.analytics
FOR INSERT
WITH CHECK (user_id = public.get_current_user_id());

-- Let me check what specific tables still need policies by querying which tables have RLS enabled but no policies
-- First, let's see all tables with RLS enabled