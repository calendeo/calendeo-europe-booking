-- Create disqualifications table
CREATE TABLE public.disqualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  question_id UUID,
  operator TEXT NOT NULL CHECK (operator IN ('is', 'is_not')),
  expected_value TEXT NOT NULL,
  logic_type TEXT NOT NULL DEFAULT 'OR' CHECK (logic_type IN ('AND', 'OR')),
  disqualification_message TEXT NOT NULL DEFAULT 'Désolé, vous ne pouvez pas réserver cet évènement pour le moment.',
  redirect_url TEXT,
  redirect_with_params BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.disqualifications ENABLE ROW LEVEL SECURITY;

-- Create policies for disqualifications
CREATE POLICY "Users can view disqualifications for their events" 
ON public.disqualifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = disqualifications.event_id 
  AND (get_current_user_id() = ANY(e.host_ids) OR e.created_by = get_current_user_id())
));

CREATE POLICY "Users can create disqualifications for their events" 
ON public.disqualifications 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = disqualifications.event_id 
  AND (get_current_user_id() = ANY(e.host_ids) OR e.created_by = get_current_user_id())
) AND created_by = get_current_user_id());

CREATE POLICY "Users can update disqualifications for their events" 
ON public.disqualifications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = disqualifications.event_id 
  AND (get_current_user_id() = ANY(e.host_ids) OR e.created_by = get_current_user_id())
) AND created_by = get_current_user_id());

CREATE POLICY "Users can delete disqualifications for their events" 
ON public.disqualifications 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM events e 
  WHERE e.id = disqualifications.event_id 
  AND (get_current_user_id() = ANY(e.host_ids) OR e.created_by = get_current_user_id())
) AND created_by = get_current_user_id());