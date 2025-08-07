-- SOLUTION FINALE : Corriger la syntaxe du header JSON dans les triggers
CREATE OR REPLACE FUNCTION public.trigger_contact_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  webhook_payload jsonb;
  header_payload jsonb;
BEGIN
  -- Construire le payload de manière sécurisée
  webhook_payload := jsonb_build_object(
    'contact_id', NEW.id,
    'action', 'contact_created',
    'email', NEW.email,
    'status', NEW.status,
    'created_at', NEW.created_at
  );

  -- Construire les headers de manière sécurisée SANS interpolation de string
  header_payload := jsonb_build_object(
    'Content-Type', 'application/json'
  );

  -- Appeler le webhook CRM sync avec un header JSON valide
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
    headers := header_payload,
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
  header_payload jsonb;
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

    -- Construire les headers de manière sécurisée SANS interpolation de string
    header_payload := jsonb_build_object(
      'Content-Type', 'application/json'
    );

    PERFORM net.http_post(
      url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
      headers := header_payload,
      body := webhook_payload
    );
  END IF;
  
  RETURN NEW;
END;
$function$;