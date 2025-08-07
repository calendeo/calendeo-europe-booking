-- Désactiver temporairement les triggers sur la table contacts pour isoler le problème
DROP TRIGGER IF EXISTS trigger_contact_created_trigger ON public.contacts;
DROP TRIGGER IF EXISTS trigger_contact_qualified_trigger ON public.contacts;

-- Lister tous les triggers existants sur la table contacts
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_statement,
  t.action_timing
FROM information_schema.triggers t
WHERE t.event_object_table = 'contacts' 
  AND t.event_object_schema = 'public';