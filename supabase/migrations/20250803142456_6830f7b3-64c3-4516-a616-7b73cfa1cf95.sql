-- Create enums for user roles and other types
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'closer', 'setter');
CREATE TYPE public.contact_status AS ENUM ('opportunity', 'lead', 'client');
CREATE TYPE public.event_type AS ENUM ('1v1', 'group', 'round_robin');
CREATE TYPE public.event_location AS ENUM ('online', 'physical', 'custom');
CREATE TYPE public.event_status AS ENUM ('confirmed', 'canceled', 'rescheduled');
CREATE TYPE public.question_type AS ENUM ('text', 'email', 'phone', 'dropdown', 'checkbox');
CREATE TYPE public.notification_type AS ENUM ('email', 'sms', 'slack');
CREATE TYPE public.notification_trigger AS ENUM ('booked', 'canceled', 'rescheduled', 'custom');
CREATE TYPE public.notification_recipient AS ENUM ('guest', 'host', 'team', 'other');
CREATE TYPE public.integration_tool AS ENUM ('google_calendar', 'slack', 'zapier', 'whatsapp');
CREATE TYPE public.integration_status AS ENUM ('connected', 'error', 'disconnected');
CREATE TYPE public.analytics_type AS ENUM ('meetings', 'conversion_rate', 'show_rate');
CREATE TYPE public.analytics_period AS ENUM ('day', 'week', 'month');

-- Users table (internal users)
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'setter',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 0 AND priority <= 5),
    calendar_connected BOOLEAN NOT NULL DEFAULT FALSE,
    slack_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Teams table
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team members junction table
CREATE TABLE public.team_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- Contacts table
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    status contact_status NOT NULL DEFAULT 'opportunity',
    utm_data JSONB,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forms table
CREATE TABLE public.forms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    disqualif_logic JSONB,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Form questions table
CREATE TABLE public.form_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type question_type NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    condition_logic JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type event_type NOT NULL,
    host_ids UUID[] NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    guest_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    calendar_link TEXT,
    location event_location NOT NULL DEFAULT 'online',
    status event_status NOT NULL DEFAULT 'confirmed',
    form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Form responses table
CREATE TABLE public.form_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.form_questions(id) ON DELETE CASCADE,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Availability slots table
CREATE TABLE public.availability_slots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0 = Monday, 6 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    exceptions JSONB, -- [{ "date": "2025-08-15", "motif": "vacances" }]
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CHECK (start_time < end_time)
);

-- Notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type notification_type NOT NULL,
    trigger notification_trigger NOT NULL,
    recipient notification_recipient NOT NULL,
    content TEXT NOT NULL,
    timing TIMESTAMP WITH TIME ZONE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Integrations table
CREATE TABLE public.integrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tool integration_tool NOT NULL,
    status integration_status NOT NULL DEFAULT 'disconnected',
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, tool)
);

-- Analytics table
CREATE TABLE public.analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type analytics_type NOT NULL,
    value DECIMAL NOT NULL,
    period analytics_period NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.users WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get current user's teams
CREATE OR REPLACE FUNCTION public.get_current_user_teams()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tm.team_id) 
  FROM public.team_members tm
  JOIN public.users u ON u.id = tm.user_id
  WHERE u.user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is in team
CREATE OR REPLACE FUNCTION public.user_in_team(_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = _team_id AND u.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get current user's internal ID
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for users table
CREATE POLICY "Users can view and modify their own profile"
ON public.users
FOR ALL
USING (user_id = auth.uid());

-- RLS Policies for teams table
CREATE POLICY "Super admin can manage all teams"
ON public.teams
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Admin can manage teams they belong to"
ON public.teams
FOR ALL
USING (
  public.get_current_user_role() = 'admin' AND
  public.user_in_team(id)
);

-- RLS Policies for team_members table
CREATE POLICY "Super admin can manage all team members"
ON public.team_members
FOR ALL
USING (public.get_current_user_role() = 'super_admin');

CREATE POLICY "Admin can manage their team members"
ON public.team_members
FOR ALL
USING (
  public.get_current_user_role() = 'admin' AND
  public.user_in_team(team_id)
);

-- RLS Policies for contacts table
CREATE POLICY "Users can manage their assigned or created contacts"
ON public.contacts
FOR ALL
USING (
  assigned_to = public.get_current_user_id() OR
  created_by = public.get_current_user_id()
);

CREATE POLICY "Admins can view all contacts in their teams"
ON public.contacts
FOR SELECT
USING (
  public.get_current_user_role() IN ('admin', 'super_admin') AND
  (
    public.get_current_user_role() = 'super_admin' OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.users u ON u.id = tm.user_id
      WHERE u.id = assigned_to AND public.user_in_team(tm.team_id)
    )
  )
);

-- RLS Policies for events table
CREATE POLICY "Users can view events they host or guest assigned to them"
ON public.events
FOR SELECT
USING (
  public.get_current_user_id() = ANY(host_ids) OR
  EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = guest_id AND 
    (c.assigned_to = public.get_current_user_id() OR c.created_by = public.get_current_user_id())
  )
);

CREATE POLICY "Admins can view all events in their teams"
ON public.events
FOR SELECT
USING (
  public.get_current_user_role() IN ('admin', 'super_admin') AND
  (
    public.get_current_user_role() = 'super_admin' OR
    EXISTS (
      SELECT 1 FROM unnest(host_ids) AS host_id
      JOIN public.team_members tm ON tm.user_id = host_id
      WHERE public.user_in_team(tm.team_id)
    )
  )
);

CREATE POLICY "Users can create events"
ON public.events
FOR INSERT
WITH CHECK (created_by = public.get_current_user_id());

CREATE POLICY "Users can update events they created or host"
ON public.events
FOR UPDATE
USING (
  created_by = public.get_current_user_id() OR
  public.get_current_user_id() = ANY(host_ids)
);

-- RLS Policies for availability_slots table
CREATE POLICY "Users can manage their own availability"
ON public.availability_slots
FOR ALL
USING (user_id = public.get_current_user_id());

-- RLS Policies for forms table
CREATE POLICY "Users can view forms from events they can access"
ON public.forms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.form_id = id AND
    (
      public.get_current_user_id() = ANY(e.host_ids) OR
      EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = e.guest_id AND 
        (c.assigned_to = public.get_current_user_id() OR c.created_by = public.get_current_user_id())
      )
    )
  )
);

CREATE POLICY "Users can create forms"
ON public.forms
FOR INSERT
WITH CHECK (created_by = public.get_current_user_id());

-- RLS Policies for form_questions table
CREATE POLICY "Users can view questions from accessible forms"
ON public.form_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.events e ON e.form_id = f.id
    WHERE f.id = form_id AND
    (
      public.get_current_user_id() = ANY(e.host_ids) OR
      EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = e.guest_id AND 
        (c.assigned_to = public.get_current_user_id() OR c.created_by = public.get_current_user_id())
      )
    )
  )
);

CREATE POLICY "Users can create form questions"
ON public.form_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_id AND f.created_by = public.get_current_user_id()
  )
);

-- RLS Policies for form_responses table
CREATE POLICY "Users can view responses from accessible forms"
ON public.form_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forms f
    JOIN public.events e ON e.form_id = f.id
    WHERE f.id = form_id AND
    (
      public.get_current_user_id() = ANY(e.host_ids) OR
      EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = e.guest_id AND 
        (c.assigned_to = public.get_current_user_id() OR c.created_by = public.get_current_user_id())
      )
    )
  )
);

CREATE POLICY "Authenticated users can create form responses"
ON public.form_responses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for notifications table
CREATE POLICY "Users can view notifications for their events"
ON public.notifications
FOR SELECT
USING (
  event_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND
    (
      public.get_current_user_id() = ANY(e.host_ids) OR
      EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = e.guest_id AND 
        (c.assigned_to = public.get_current_user_id() OR c.created_by = public.get_current_user_id())
      )
    )
  )
);

CREATE POLICY "Admin and super_admin can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN ('admin', 'super_admin') AND
  created_by = public.get_current_user_id()
);

-- RLS Policies for integrations table
CREATE POLICY "Users can manage their own integrations"
ON public.integrations
FOR ALL
USING (user_id = public.get_current_user_id());

-- RLS Policies for analytics table
CREATE POLICY "Users can view their own analytics"
ON public.analytics
FOR SELECT
USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can view analytics for their team members"
ON public.analytics
FOR SELECT
USING (
  public.get_current_user_role() IN ('admin', 'super_admin') AND
  (
    public.get_current_user_role() = 'super_admin' OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = user_id AND public.user_in_team(tm.team_id)
    )
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();