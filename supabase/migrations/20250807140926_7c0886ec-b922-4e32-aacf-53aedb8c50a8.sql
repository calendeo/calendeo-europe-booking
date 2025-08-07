-- Vérifier et supprimer temporairement les triggers sur la table events qui pourraient causer des erreurs JSON
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_statement,
  t.action_timing
FROM information_schema.triggers t
WHERE t.event_object_table = 'events' 
  AND t.event_object_schema = 'public';

-- Supprimer temporairement tous les triggers sur events
DROP TRIGGER IF EXISTS trigger_event_created_trigger ON public.events;
DROP TRIGGER IF EXISTS trigger_event_status_changed_trigger ON public.events;
DROP TRIGGER IF EXISTS event_created_webhook ON public.events;
DROP TRIGGER IF EXISTS event_status_changed_webhook ON public.events;