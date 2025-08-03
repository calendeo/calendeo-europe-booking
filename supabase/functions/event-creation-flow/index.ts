import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventCreationRequest {
  name: string;
  type: string;
  duration: number;
  date_time: string;
  host_ids: string[];
  location: string;
  guest_id: string;
  form_data?: any;
  timezone?: string;
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

    const eventData: EventCreationRequest = await req.json();
    console.log('Starting event creation flow for:', eventData);

    // Étape 1: Créer le formulaire si nécessaire
    let formId = null;
    if (eventData.form_data) {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .insert({
          name: `Formulaire - ${eventData.name}`,
          created_by: eventData.host_ids[0]
        })
        .select()
        .single();

      if (formError) throw formError;
      formId = form.id;

      // Créer les questions du formulaire
      if (eventData.form_data.questions) {
        const questions = eventData.form_data.questions.map((q: any) => ({
          form_id: formId,
          label: q.label,
          type: q.type,
          required: q.required || false
        }));

        const { error: questionsError } = await supabase
          .from('form_questions')
          .insert(questions);

        if (questionsError) throw questionsError;
      }
    }

    // Étape 2: Créer l'événement
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: eventData.name,
        type: eventData.type,
        duration: eventData.duration,
        date_time: eventData.date_time,
        host_ids: eventData.host_ids,
        location: eventData.location,
        guest_id: eventData.guest_id,
        form_id: formId,
        timezone: eventData.timezone || 'UTC',
        status: 'pending',
        created_by: eventData.host_ids[0]
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Étape 3: Générer le lien calendrier
    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.name)}&dates=${new Date(eventData.date_time).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    
    const { error: updateError } = await supabase
      .from('events')
      .update({ calendar_link: calendarLink })
      .eq('id', event.id);

    if (updateError) throw updateError;

    // Étape 4: Créer les notifications par défaut
    const notifications = [
      {
        type: 'email',
        trigger: 'event_confirmed',
        recipient: 'guest',
        content: `Votre rendez-vous "${eventData.name}" est confirmé`,
        event_id: event.id,
        created_by: eventData.host_ids[0]
      },
      {
        type: 'email',
        trigger: 'reminder_24h',
        recipient: 'both',
        content: `Rappel: rendez-vous "${eventData.name}" demain`,
        timing: new Date(new Date(eventData.date_time).getTime() - 24 * 60 * 60 * 1000).toISOString(),
        event_id: event.id,
        created_by: eventData.host_ids[0]
      },
      {
        type: 'email',
        trigger: 'reminder_1h',
        recipient: 'both',
        content: `Rappel: rendez-vous "${eventData.name}" dans 1 heure`,
        timing: new Date(new Date(eventData.date_time).getTime() - 60 * 60 * 1000).toISOString(),
        event_id: event.id,
        created_by: eventData.host_ids[0]
      }
    ];

    const { error: notificationsError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationsError) throw notificationsError;

    console.log('Event creation flow completed successfully:', event.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: event.id,
        form_id: formId,
        calendar_link: calendarLink
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in event creation flow:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});