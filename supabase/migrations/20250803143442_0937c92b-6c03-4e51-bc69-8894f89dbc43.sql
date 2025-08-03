-- Add missing RLS policies for tables that don't have any

-- RLS Policies for teams table (missing policies)
CREATE POLICY "Users can view teams they belong to"
ON public.teams
FOR SELECT
USING (
  public.get_current_user_role() = 'super_admin' OR
  (public.get_current_user_role() = 'admin' AND public.user_in_team(id)) OR
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = id AND tm.user_id = public.get_current_user_id()
  )
);

-- RLS Policies for team_members table (missing policies)  
CREATE POLICY "Users can view team memberships they belong to"
ON public.team_members
FOR SELECT
USING (
  public.get_current_user_role() = 'super_admin' OR
  (public.get_current_user_role() = 'admin' AND public.user_in_team(team_id)) OR
  user_id = public.get_current_user_id()
);

-- RLS Policies for forms table (missing UPDATE/DELETE policies)
CREATE POLICY "Users can update forms they created"
ON public.forms
FOR UPDATE
USING (created_by = public.get_current_user_id());

CREATE POLICY "Users can delete forms they created"
ON public.forms
FOR DELETE
USING (created_by = public.get_current_user_id());

-- RLS Policies for form_questions table (missing UPDATE/DELETE policies)
CREATE POLICY "Users can update questions from forms they created"
ON public.form_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_id AND f.created_by = public.get_current_user_id()
  )
);

CREATE POLICY "Users can delete questions from forms they created"
ON public.form_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_id AND f.created_by = public.get_current_user_id()
  )
);

-- RLS Policies for form_responses table (missing UPDATE/DELETE policies)
CREATE POLICY "Users can update responses from accessible forms"
ON public.form_responses
FOR UPDATE
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

CREATE POLICY "Users can delete responses from accessible forms"
ON public.form_responses
FOR DELETE
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

-- RLS Policies for notifications table (missing UPDATE/DELETE policies)
CREATE POLICY "Users can update notifications they created"
ON public.notifications
FOR UPDATE
USING (created_by = public.get_current_user_id());

CREATE POLICY "Users can delete notifications they created"
ON public.notifications
FOR DELETE
USING (created_by = public.get_current_user_id());