-- SOLUTION RADICALE : Supprimer complètement les triggers défaillants qui bloquent la création de contacts
DROP TRIGGER IF EXISTS contact_created_webhook ON public.contacts;
DROP TRIGGER IF EXISTS contact_qualified_webhook ON public.contacts;

-- Tenter d'activer l'extension pg_net si elle existe
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Vérifier si l'extension est maintenant disponible
SELECT * FROM pg_extension WHERE extname = 'pg_net';