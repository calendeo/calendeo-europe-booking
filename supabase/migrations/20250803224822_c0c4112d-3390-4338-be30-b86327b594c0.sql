-- Drop existing notifications table if it exists
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create the notifications table with the specified schema
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('guest', 'host', 'manager', 'admin')),
  offset_type TEXT NOT NULL CHECK (offset_type IN ('before', 'after')),
  offset_value INTEGER NOT NULL,
  offset_unit TEXT NOT NULL CHECK (offset_unit IN ('minutes', 'hours', 'days')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- 1. Users can view reminders only for events they created or are assigned to as host
CREATE POLICY "Users can view notifications for their events"
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = notifications.event_id
    AND (
      e.created_by = get_current_user_id()
      OR get_current_user_id() = ANY(e.host_ids)
    )
  )
);

-- 2. Users can create reminders only for their own events
CREATE POLICY "Users can create notifications for their events"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = notifications.event_id
    AND (
      e.created_by = get_current_user_id()
      OR get_current_user_id() = ANY(e.host_ids)
    )
  )
  AND created_by = get_current_user_id()
);

-- 3. Users can update reminders only if they are the creator of the event or host
CREATE POLICY "Users can update notifications for their events"
ON public.notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = notifications.event_id
    AND (
      e.created_by = get_current_user_id()
      OR get_current_user_id() = ANY(e.host_ids)
    )
  )
);

-- 4. Users can delete reminders only if they are the creator of the event or host
CREATE POLICY "Users can delete notifications for their events"
ON public.notifications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = notifications.event_id
    AND (
      e.created_by = get_current_user_id()
      OR get_current_user_id() = ANY(e.host_ids)
    )
  )
);

-- Create trigger for automatic updated_at timestamps
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();