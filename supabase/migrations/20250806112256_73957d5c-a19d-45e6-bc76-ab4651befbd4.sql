-- Fix infinite recursion in team_members RLS policies
-- The problem is that some functions reference the same table they're protecting

-- Drop problematic policies
DROP POLICY IF EXISTS "Admin can manage their team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Super admin can manage all team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team memberships they belong to" ON public.team_members;

-- Create simple, non-recursive policies
CREATE POLICY "Team members can view their own memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (user_id = get_current_user_id());

CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (get_current_user_role() IN ('admin', 'super_admin'));

-- Also fix the user_in_team function to avoid recursion
DROP FUNCTION IF EXISTS public.user_in_team(uuid);

CREATE OR REPLACE FUNCTION public.user_in_team(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid() 
    AND u.id IN (
      SELECT tm.user_id FROM public.team_members tm 
      WHERE tm.team_id = _team_id
    )
  );
$$;