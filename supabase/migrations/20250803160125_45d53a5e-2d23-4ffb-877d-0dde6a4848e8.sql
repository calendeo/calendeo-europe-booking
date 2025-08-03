-- Triggers pour automatiser les workflows Calendeo

-- 1. Trigger après création d'un contact -> sync CRM
CREATE OR REPLACE FUNCTION trigger_contact_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler le webhook CRM sync de manière asynchrone
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'contact_id', NEW.id,
      'action', 'contact_created'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER contact_created_webhook
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_contact_created();

-- 2. Trigger après mise à jour statut contact -> sync CRM si qualifié
CREATE OR REPLACE FUNCTION trigger_contact_qualified()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut change vers 'lead' ou 'opportunity', déclencher le CRM sync
  IF OLD.status != NEW.status AND NEW.status IN ('lead', 'opportunity') THEN
    PERFORM net.http_post(
      url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'contact_id', NEW.id,
        'action', 'contact_qualified'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER contact_qualified_webhook
  AFTER UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_contact_qualified();

-- 3. Trigger après création d'événement -> notifications + CRM sync
CREATE OR REPLACE FUNCTION trigger_event_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Déclencher les notifications de confirmation
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/event-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'event_id', NEW.id,
      'trigger', 'event_confirmed'
    )
  );
  
  -- Déclencher le CRM sync
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/crm-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'contact_id', NEW.guest_id,
      'event_id', NEW.id,
      'action', 'event_scheduled'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER event_created_webhook
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_created();

-- 4. Trigger après mise à jour statut événement -> notifications
CREATE OR REPLACE FUNCTION trigger_event_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'événement est confirmé, déclencher les notifications
  IF OLD.status != NEW.status AND NEW.status = 'confirmed' THEN
    PERFORM net.http_post(
      url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/event-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'event_id', NEW.id,
        'trigger', 'event_confirmed'
      )
    );
  END IF;
  
  -- Si l'événement est annulé, déclencher les notifications d'annulation
  IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
    PERFORM net.http_post(
      url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/event-notifications',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'event_id', NEW.id,
        'trigger', 'event_cancelled'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER event_status_changed_webhook
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_status_changed();

-- 5. Fonction pour détecter les leads abandonnés (à appeler via cron)
CREATE OR REPLACE FUNCTION detect_abandoned_leads()
RETURNS void AS $$
BEGIN
  -- Appeler la fonction de détection des leads abandonnés
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/lead-recovery',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'action', 'detect_abandoned'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour traiter les notifications programmées (à appeler via cron)
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS void AS $$
BEGIN
  -- Traiter les notifications programmées
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/event-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'trigger', 'process_scheduled'
    )
  );
  
  -- Traiter les relances de leads abandonnés
  PERFORM net.http_post(
    url := 'https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/lead-recovery',
    headers := '{"Content-Type": "application/json, "Authorization": "Bearer ' || current_setting('app.jwt_secret', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'action', 'process_scheduled'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;