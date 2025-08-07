-- Corriger les triggers problématiques qui causent l'erreur JSON
-- Recréer les triggers avec une gestion JSON plus robuste

CREATE OR REPLACE FUNCTION public.trigger_contact_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  webhook_payload jsonb;
BEGIN
  -- Construire le payload de manière sécurisée
  webhook_payload := jsonb_build_object(
    'contact_id', NEW.id,
    'action', 'contact_created',
    'email', NEW.email,
    'status', NEW.status,
    'created_at', NEW.created_at
  );

  -- Appeler le webhook CRM sync de manière asynchrone avec un payload JSON sécurisé
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := webhook_payload
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_contact_qualified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  webhook_payload jsonb;
BEGIN
  -- Si le statut change vers 'lead' ou 'opportunity', déclencher le CRM sync
  IF OLD.status != NEW.status AND NEW.status IN ('lead', 'opportunity') THEN
    -- Construire le payload de manière sécurisée
    webhook_payload := jsonb_build_object(
      'contact_id', NEW.id,
      'action', 'contact_qualified',
      'email', NEW.email,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'updated_at', NEW.created_at
    );

    PERFORM net.http_post(
      url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
      body := webhook_payload
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recréer les triggers avec les fonctions corrigées
CREATE TRIGGER contact_created_webhook
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION trigger_contact_created();

CREATE TRIGGER contact_qualified_webhook
  AFTER UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION trigger_contact_qualified();