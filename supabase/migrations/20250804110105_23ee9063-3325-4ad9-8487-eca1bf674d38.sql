-- Create RLS policies for contacts based on event ownership
-- Users can view contacts for events they created
CREATE POLICY "Users can view contacts for their events" 
ON public.contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.guest_id = contacts.id 
    AND e.created_by = get_current_user_id()
  )
);

-- Users can create contacts (for manual contact creation)
CREATE POLICY "Users can create contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (created_by = get_current_user_id());

-- Users can update contacts for their events
CREATE POLICY "Users can update contacts for their events" 
ON public.contacts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.guest_id = contacts.id 
    AND e.created_by = get_current_user_id()
  )
);

-- Users can delete contacts for their events
CREATE POLICY "Users can delete contacts for their events" 
ON public.contacts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.events e 
    WHERE e.guest_id = contacts.id 
    AND e.created_by = get_current_user_id()
  )
);