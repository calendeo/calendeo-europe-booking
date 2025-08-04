-- Create missing tables for event creation flow

-- Create event_availability_rules table for step 2 (Horaires)
CREATE TABLE public.event_availability_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create event_notifications table for step 6 (Notifications)
CREATE TABLE public.event_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('guest', 'host', 'manager', 'admin')),
  offset_type TEXT NOT NULL CHECK (offset_type IN ('before', 'after')),
  offset_value INTEGER NOT NULL,
  offset_unit TEXT NOT NULL CHECK (offset_unit IN ('minutes', 'hours', 'days')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Add missing columns to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#1a6be3';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS confirmation_settings JSONB;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'private' CHECK (mode IN ('private', 'group', 'round_robin'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS guest_limit INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS show_remaining_spots BOOLEAN DEFAULT false;

-- Create unique constraint on slug for events
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON public.events(slug) WHERE slug IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.event_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for event_availability_rules
CREATE POLICY "Users can create availability rules for their events" 
ON public.event_availability_rules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_availability_rules.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  ) 
  AND created_by = get_current_user_id()
);

CREATE POLICY "Users can view availability rules for their events" 
ON public.event_availability_rules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_availability_rules.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  )
);

CREATE POLICY "Users can update availability rules for their events" 
ON public.event_availability_rules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_availability_rules.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  )
  AND created_by = get_current_user_id()
);

CREATE POLICY "Users can delete availability rules for their events" 
ON public.event_availability_rules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_availability_rules.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  )
  AND created_by = get_current_user_id()
);

-- Create RLS policies for event_notifications
CREATE POLICY "Users can create notifications for their events" 
ON public.event_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_notifications.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  ) 
  AND created_by = get_current_user_id()
);

CREATE POLICY "Users can view notifications for their events" 
ON public.event_notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_notifications.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  )
);

CREATE POLICY "Users can update notifications for their events" 
ON public.event_notifications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_notifications.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  )
  AND created_by = get_current_user_id()
);

CREATE POLICY "Users can delete notifications for their events" 
ON public.event_notifications 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_notifications.event_id 
    AND (e.created_by = get_current_user_id() OR get_current_user_id() = ANY(e.host_ids))
  )
  AND created_by = get_current_user_id()
);

-- Add RLS policies for events table to allow creation
CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (created_by = get_current_user_id() OR get_current_user_id() = ANY(host_ids));

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (created_by = get_current_user_id());

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_event_availability_rules_updated_at
  BEFORE UPDATE ON public.event_availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_notifications_updated_at
  BEFORE UPDATE ON public.event_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();