-- Create forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form_questions table
CREATE TABLE public.form_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('short_text', 'email', 'number', 'single_choice', 'multiple_choice', 'date', 'yes_no')),
  required BOOLEAN NOT NULL DEFAULT false,
  question_order INTEGER NOT NULL DEFAULT 0,
  options JSONB,
  condition_logic JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form_responses table
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms
CREATE POLICY "Users can create their own forms" 
ON public.forms 
FOR INSERT 
WITH CHECK (created_by = get_current_user_id());

CREATE POLICY "Users can view their own forms" 
ON public.forms 
FOR SELECT 
USING (created_by = get_current_user_id());

CREATE POLICY "Users can update their own forms" 
ON public.forms 
FOR UPDATE 
USING (created_by = get_current_user_id());

CREATE POLICY "Users can delete their own forms" 
ON public.forms 
FOR DELETE 
USING (created_by = get_current_user_id());

-- RLS Policies for form_questions
CREATE POLICY "Users can create questions for their forms" 
ON public.form_questions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.forms f 
  WHERE f.id = form_questions.form_id 
  AND f.created_by = get_current_user_id()
));

CREATE POLICY "Users can view questions from their forms" 
ON public.form_questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.forms f 
  WHERE f.id = form_questions.form_id 
  AND f.created_by = get_current_user_id()
));

CREATE POLICY "Users can update questions from their forms" 
ON public.form_questions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.forms f 
  WHERE f.id = form_questions.form_id 
  AND f.created_by = get_current_user_id()
));

CREATE POLICY "Users can delete questions from their forms" 
ON public.form_questions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.forms f 
  WHERE f.id = form_questions.form_id 
  AND f.created_by = get_current_user_id()
));

-- RLS Policies for form_responses
CREATE POLICY "Anyone can submit form responses" 
ON public.form_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Form owners can view responses to their forms" 
ON public.form_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.forms f 
  WHERE f.id = form_responses.form_id 
  AND f.created_by = get_current_user_id()
));

-- Create trigger for updating updated_at
CREATE TRIGGER update_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_forms_created_by ON public.forms(created_by);
CREATE INDEX idx_forms_event_id ON public.forms(event_id);
CREATE INDEX idx_form_questions_form_id ON public.form_questions(form_id);
CREATE INDEX idx_form_questions_order ON public.form_questions(form_id, question_order);
CREATE INDEX idx_form_responses_form_id ON public.form_responses(form_id);