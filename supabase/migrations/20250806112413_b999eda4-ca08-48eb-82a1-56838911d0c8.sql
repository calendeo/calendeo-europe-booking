-- Fix infinite recursion in team_members RLS policies by simplifying them
-- Drop all problematic policies first
DROP POLICY IF EXISTS "Admin can manage their team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members; 
DROP POLICY IF EXISTS "Super admin can manage all team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team memberships they belong to" ON public.team_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own team memberships"
ON public.team_members
FOR SELECT  
TO authenticated
USING (user_id = get_current_user_id());

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role full access to team members"
ON public.team_members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a simple admin policy that doesn't cause recursion
CREATE POLICY "Super admins can manage all team members"
ON public.team_members
FOR ALL
TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.user_id = auth.uid() 
    AND u.role = 'super_admin'
  )
);