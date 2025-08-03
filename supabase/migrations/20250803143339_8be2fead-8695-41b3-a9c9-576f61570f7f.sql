-- First drop all policies that depend on the functions
DROP POLICY IF EXISTS "Super admin can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Admin can manage teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Super admin can manage all team members" ON public.team_members;
DROP POLICY IF EXISTS "Admin can manage their team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can view all contacts in their teams" ON public.contacts;
DROP POLICY IF EXISTS "Admins can view all events in their teams" ON public.events;
DROP POLICY IF EXISTS "Admin and super_admin can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view analytics for their team members" ON public.analytics;

-- Now drop and recreate functions with proper search_path security
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_teams() CASCADE;
DROP FUNCTION IF EXISTS public.user_in_team(_team_id UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate functions with proper search_path security
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
  SELECT role FROM public.users WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_current_user_teams()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(tm.team_id) 
  FROM public.team_members tm
  JOIN public.users u ON u.id = tm.user_id
  WHERE u.user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.user_in_team(_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = _team_id AND u.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate policies with corrected functions
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

CREATE POLICY "Admin and super_admin can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  public.get_current_user_role() IN ('admin', 'super_admin') AND
  created_by = public.get_current_user_id()
);

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

-- Recreate the trigger
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();