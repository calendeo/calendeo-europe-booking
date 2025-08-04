-- Create team_invitations table for invitation management
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  team_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'setter',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_invitations
CREATE POLICY "Users can view invitations for their team" 
ON public.team_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_invitations.team_id 
    AND u.user_id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can create invitations for their team" 
ON public.team_invitations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_invitations.team_id 
    AND u.user_id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
  AND invited_by = get_current_user_id()
);

CREATE POLICY "Admins can update invitations for their team" 
ON public.team_invitations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_invitations.team_id 
    AND u.user_id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete invitations for their team" 
ON public.team_invitations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_invitations.team_id 
    AND u.user_id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
  )
);

-- Update team_members policies to allow admins to manage their team
CREATE POLICY "Admins can manage team members" 
ON public.team_members 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
    AND u.role IN ('admin', 'super_admin')
    AND (
      u.role = 'super_admin' OR 
      EXISTS (
        SELECT 1 FROM public.team_members tm2
        WHERE tm2.team_id = team_members.team_id
        AND tm2.user_id = u.id
      )
    )
  )
);

-- Add trigger for updating team_invitations updated_at
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);