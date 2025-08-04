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
  host_ids: string[];
  location: string;
  color?: string;
  slug?: string;
  description?: string;
  mode?: string;
  guest_limit?: number;
  show_remaining_spots?: boolean;
  form_data?: any;
  timezone?: string;
  availability_rules?: any[];
  notifications?: any[];
  disqualifications?: any;
  confirmation_settings?: any;
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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user ID from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User not found in users table');
    }

    const currentUserId = userData.id;
    const eventData: EventCreationRequest = await req.json();
    console.log('Starting event creation flow for:', eventData);

    // Validation
    if (!eventData.name || !eventData.duration || !eventData.host_ids?.length) {
      throw new Error('Missing required fields: name, duration, or host_ids');
    }

    // Step 1: Create form if needed (Step 3 data)
    let formId = null;
    if (eventData.form_data?.custom_questions?.length > 0) {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .insert({
          name: `Formulaire - ${eventData.name}`,
          created_by: currentUserId
        })
        .select()
        .single();

      if (formError) throw formError;
      formId = form.id;

      // Create form questions
      const questions = eventData.form_data.custom_questions.map((q: any) => ({
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

    // Step 2: Create the main event (Step 1 data)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: eventData.name,
        type: eventData.type || 'consultation',
        duration: eventData.duration,
        host_ids: eventData.host_ids,
        location: eventData.location || 'zoom',
        form_id: formId,
        timezone: eventData.timezone || 'UTC',
        status: 'confirmed',
        created_by: currentUserId,
        color: eventData.color || '#1a6be3',
        slug: eventData.slug,
        description: eventData.description,
        mode: eventData.mode || 'private',
        guest_limit: eventData.guest_limit,
        show_remaining_spots: eventData.show_remaining_spots || false,
        confirmation_settings: eventData.confirmation_settings
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // Step 3: Create availability rules if provided (Step 2 data)
    if (eventData.availability_rules?.length > 0) {
      const availabilityRules = eventData.availability_rules.map((rule: any) => ({
        event_id: event.id,
        weekday: rule.weekday,
        start_time: rule.start_time,
        end_time: rule.end_time,
        timezone: rule.timezone || eventData.timezone || 'UTC',
        created_by: currentUserId
      }));

      const { error: availabilityError } = await supabase
        .from('event_availability_rules')
        .insert(availabilityRules);

      if (availabilityError) throw availabilityError;
    }

    // Step 4: Create disqualification rules if provided (Step 4 data)
    if (eventData.disqualifications?.rules?.length > 0) {
      const disqualificationRules = eventData.disqualifications.rules.map((rule: any) => ({
        event_id: event.id,
        question_id: rule.question_id,
        operator: rule.operator,
        expected_value: rule.expected_value,
        logic_type: eventData.disqualifications.logic_type || 'OR',
        disqualification_message: eventData.disqualifications.message || 'Désolé, vous ne pouvez pas réserver cet évènement pour le moment.',
        redirect_url: eventData.disqualifications.redirect_enabled ? eventData.disqualifications.redirect_url : null,
        redirect_with_params: eventData.disqualifications.redirect_with_params || false,
        created_by: currentUserId
      }));

      const { error: disqualificationError } = await supabase
        .from('disqualifications')
        .insert(disqualificationRules);

      if (disqualificationError) throw disqualificationError;
    }

    // Step 5: Create notifications if provided (Step 6 data)
    if (eventData.notifications?.length > 0) {
      const eventNotifications = eventData.notifications.map((notif: any) => ({
        event_id: event.id,
        recipient_type: notif.recipient_type,
        offset_type: notif.offset_type,
        offset_value: notif.offset_value,
        offset_unit: notif.offset_unit,
        subject: notif.subject,
        message: notif.message,
        is_active: notif.is_active !== false,
        created_by: currentUserId
      }));

      const { error: notificationsError } = await supabase
        .from('event_notifications')
        .insert(eventNotifications);

      if (notificationsError) throw notificationsError;
    }

    console.log('Event creation flow completed successfully:', event.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: event.id,
        event: event,
        form_id: formId,
        slug: eventData.slug
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