import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  event_id?: string;
  trigger: 'event_confirmed' | 'reminder_24h' | 'reminder_1h' | 'event_cancelled' | 'event_rescheduled' | 'process_scheduled';
  new_date_time?: string; // Pour les replanifications
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

    const { event_id, trigger, new_date_time }: NotificationRequest = await req.json();
    console.log('Processing notification:', trigger, { event_id, new_date_time });

    if (trigger === 'process_scheduled') {
      // Traiter les notifications programmées
      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000);

      const { data: scheduledNotifications, error: scheduleError } = await supabase
        .from('notifications')
        .select(`
          *,
          events(*, contacts(first_name, last_name, email, phone))
        `)
        .not('timing', 'is', null)
        .gte('timing', now.toISOString())
        .lte('timing', in5Minutes.toISOString());

      if (scheduleError) throw scheduleError;

      for (const notification of scheduledNotifications) {
        await processNotification(supabase, notification, notification.events);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: scheduledNotifications.length 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!event_id) throw new Error('event_id requis');

    // Récupérer l'événement et les informations du contact
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        contacts(first_name, last_name, email, phone),
        users!events_host_ids_fkey(first_name, last_name, email, slack_id)
      `)
      .eq('id', event_id)
      .single();

    if (eventError) throw eventError;

    // Récupérer les notifications configurées pour ce trigger
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('event_id', event_id)
      .eq('trigger', trigger);

    if (notifError) throw notifError;

    // Traiter chaque notification
    for (const notification of notifications) {
      await processNotification(supabase, notification, event, new_date_time);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: notifications.length 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in event notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

async function processNotification(supabase: any, notification: any, event: any, newDateTime?: string) {
  const contact = event.contacts;
  const hosts = Array.isArray(event.users) ? event.users : [event.users];

  console.log('Processing notification:', {
    type: notification.type,
    recipient: notification.recipient,
    trigger: notification.trigger
  });

  switch (notification.type) {
    case 'email':
      await sendEmailNotification(notification, event, contact, hosts, newDateTime);
      break;
    case 'sms':
      await sendSMSNotification(notification, event, contact, newDateTime);
      break;
    case 'slack':
      await sendSlackNotification(supabase, notification, event, hosts, newDateTime);
      break;
  }
}

async function sendEmailNotification(notification: any, event: any, contact: any, hosts: any[], newDateTime?: string) {
  const eventDateTime = newDateTime || event.date_time;
  const formattedDate = new Date(eventDateTime).toLocaleString('fr-FR');
  
  let subject = '';
  let content = notification.content;

  switch (notification.trigger) {
    case 'event_confirmed':
      subject = `✅ Rendez-vous confirmé - ${event.name}`;
      break;
    case 'reminder_24h':
      subject = `🔔 Rappel 24h - ${event.name}`;
      break;
    case 'reminder_1h':
      subject = `⏰ Rappel 1h - ${event.name}`;
      break;
    case 'event_cancelled':
      subject = `❌ Rendez-vous annulé - ${event.name}`;
      break;
    case 'event_rescheduled':
      subject = `📅 Rendez-vous reporté - ${event.name}`;
      break;
  }

  const emailData = {
    subject,
    content: content.replace(/\{event_name\}/g, event.name)
                   .replace(/\{event_date\}/g, formattedDate)
                   .replace(/\{contact_name\}/g, contact.first_name),
    event,
    contact,
    hosts
  };

  // Log de l'email (remplacer par l'appel à votre service d'email)
  console.log('Email à envoyer:', emailData);
}

async function sendSMSNotification(notification: any, event: any, contact: any, newDateTime?: string) {
  if (!contact.phone) {
    console.warn('Pas de numéro de téléphone pour le contact:', contact.id);
    return;
  }

  const eventDateTime = newDateTime || event.date_time;
  const formattedDate = new Date(eventDateTime).toLocaleString('fr-FR');
  
  const smsContent = notification.content
    .replace(/\{event_name\}/g, event.name)
    .replace(/\{event_date\}/g, formattedDate)
    .replace(/\{contact_name\}/g, contact.first_name);

  // Log du SMS (remplacer par l'appel à votre service SMS)
  console.log('SMS à envoyer:', {
    to: contact.phone,
    content: smsContent
  });
}

async function sendSlackNotification(supabase: any, notification: any, event: any, hosts: any[], newDateTime?: string) {
  for (const host of hosts) {
    if (!host.slack_id) continue;

    // Récupérer l'intégration Slack du host
    const { data: slackIntegration } = await supabase
      .from('integrations')
      .select('config')
      .eq('user_id', host.id)
      .eq('tool', 'slack')
      .eq('status', 'connected')
      .single();

    if (!slackIntegration?.config?.webhook_url) continue;

    const eventDateTime = newDateTime || event.date_time;
    const formattedDate = new Date(eventDateTime).toLocaleString('fr-FR');

    let icon = '📅';
    switch (notification.trigger) {
      case 'event_confirmed': icon = '✅'; break;
      case 'reminder_24h': icon = '🔔'; break;
      case 'reminder_1h': icon = '⏰'; break;
      case 'event_cancelled': icon = '❌'; break;
      case 'event_rescheduled': icon = '📅'; break;
    }

    const slackMessage = {
      text: `${icon} ${notification.content}`
        .replace(/\{event_name\}/g, event.name)
        .replace(/\{event_date\}/g, formattedDate)
        .replace(/\{host_name\}/g, host.first_name),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${event.name}*\n📅 ${formattedDate}\n👤 ${event.contacts.first_name} ${event.contacts.last_name}`
          }
        }
      ]
    };

    try {
      await fetch(slackIntegration.config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });
    } catch (error) {
      console.error('Erreur envoi Slack:', error);
    }
  }
}