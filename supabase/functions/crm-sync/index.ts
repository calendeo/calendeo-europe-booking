import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRMSyncRequest {
  contact_id: string;
  event_id?: string;
  action: 'contact_created' | 'contact_qualified' | 'event_scheduled';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { contact_id, event_id, action }: CRMSyncRequest = await req.json();
    console.log('CRM sync action:', action, { contact_id, event_id });

    // Récupérer les informations du contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        *,
        users(first_name, last_name, email)
      `)
      .eq('id', contact_id)
      .single();

    if (contactError) throw contactError;

    // Préparer les données de base pour le CRM
    let crmPayload = {
      // Informations contact
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      timezone: contact.timezone,
      
      // Informations de tracking
      utm_source: contact.utm_data?.utm_source,
      utm_medium: contact.utm_data?.utm_medium,
      utm_campaign: contact.utm_data?.utm_campaign,
      utm_term: contact.utm_data?.utm_term,
      utm_content: contact.utm_data?.utm_content,
      
      // Informations de qualification
      status: contact.status,
      created_at: contact.created_at,
      
      // Informations d'assignation
      assigned_to: contact.assigned_to ? {
        id: contact.assigned_to,
        name: contact.users ? `${contact.users.first_name} ${contact.users.last_name}` : null,
        email: contact.users?.email
      } : null,
      
      // Métadonnées
      source: 'calendeo',
      calendeo_contact_id: contact.id,
      
      // Action déclenchante
      trigger_action: action,
      sync_timestamp: new Date().toISOString()
    };

    // Ajouter des informations spécifiques selon l'action
    switch (action) {
      case 'event_scheduled':
        if (event_id) {
          const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', event_id)
            .single();

          if (eventError) throw eventError;

          crmPayload = {
            ...crmPayload,
            event: {
              id: event.id,
              name: event.name,
              type: event.type,
              date_time: event.date_time,
              duration: event.duration,
              location: event.location,
              status: event.status,
              calendar_link: event.calendar_link
            }
          };
        }
        break;

      case 'contact_qualified':
        // Récupérer les réponses du formulaire pour le contexte
        const { data: formResponses } = await supabase
          .from('form_responses')
          .select(`
            response,
            form_questions(label, type)
          `)
          .eq('contact_id', contact_id);

        if (formResponses) {
          crmPayload = {
            ...crmPayload,
            form_responses: formResponses.reduce((acc: any, fr: any) => {
              acc[fr.form_questions.label] = fr.response;
              return acc;
            }, {})
          };
        }
        break;
    }

    // Récupérer les webhooks CRM configurés pour l'utilisateur assigné
    const userId = contact.assigned_to || contact.created_by;
    
    const { data: crmIntegrations, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('user_id', userId)
      .in('tool', ['hubspot', 'salesforce', 'pipedrive', 'custom_webhook'])
      .eq('status', 'connected');

    if (integrationError) throw integrationError;

    const syncResults = [];

    // Envoyer vers chaque CRM configuré
    for (const integration of crmIntegrations) {
      try {
        const config = integration.config;
        
        if (config.webhook_url) {
          // Webhook générique
          const response = await fetch(config.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': config.auth_header ? `Bearer ${config.api_key}` : undefined,
              'X-Calendeo-Signature': await generateSignature(crmPayload, config.secret),
            },
            body: JSON.stringify(crmPayload)
          });

          syncResults.push({
            service: integration.tool,
            status: response.ok ? 'success' : 'error',
            status_code: response.status,
            response: response.ok ? await response.json() : await response.text()
          });

        } else if (integration.tool === 'hubspot' && config.api_key) {
          // Intégration HubSpot spécifique
          const hubspotPayload = formatForHubSpot(crmPayload);
          
          const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.api_key}`
            },
            body: JSON.stringify(hubspotPayload)
          });

          syncResults.push({
            service: 'hubspot',
            status: response.ok ? 'success' : 'error',
            status_code: response.status,
            response: response.ok ? await response.json() : await response.text()
          });
        }

      } catch (error) {
        console.error(`Erreur sync CRM ${integration.tool}:`, error);
        syncResults.push({
          service: integration.tool,
          status: 'error',
          error: error.message
        });
      }
    }

    // Enregistrer les logs de synchronisation
    if (syncResults.length > 0) {
      const logData = {
        type: 'webhook',
        value: syncResults.filter(r => r.status === 'success').length,
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        period: 'daily',
        created_at: new Date().toISOString()
      };

      await supabase.from('analytics').insert(logData);
    }

    console.log('CRM sync completed:', {
      contact_id,
      action,
      synced_services: syncResults.length,
      successful: syncResults.filter(r => r.status === 'success').length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        contact_id,
        action,
        sync_results: syncResults,
        payload_sent: crmPayload
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in CRM sync:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

// Fonctions utilitaires
async function generateSignature(payload: any, secret?: string): Promise<string> {
  if (!secret) return '';
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(JSON.stringify(payload))
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatForHubSpot(payload: any) {
  return {
    properties: {
      email: payload.email,
      firstname: payload.first_name,
      lastname: payload.last_name,
      phone: payload.phone,
      calendeo_id: payload.calendeo_contact_id,
      calendeo_status: payload.status,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      lifecyclestage: payload.status === 'lead' ? 'lead' : 'subscriber'
    }
  };
}