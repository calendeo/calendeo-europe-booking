-- Insérer un contact test directement dans la DB pour identifier le problème exact
INSERT INTO public.contacts (
  first_name, 
  last_name, 
  email, 
  created_by, 
  status, 
  timezone,
  utm_data
) VALUES (
  'Test',
  'Direct', 
  'test-direct@example.com',
  'f166e711-a455-44e9-93c1-acb4f643899e',
  'opportunity',
  'UTC',
  '{}'::jsonb
)