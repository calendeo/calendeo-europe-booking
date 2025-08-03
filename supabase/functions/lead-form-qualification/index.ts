import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormSubmissionRequest {
  form_id: string;
  responses: Array<{
    question_id: string;
    response: string;
  }>;
  contact_info: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    timezone?: string;
  };
  utm_data?: any;
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

    const { form_id, responses, contact_info, utm_data }: FormSubmissionRequest = await req.json();
    console.log('Starting lead form qualification for form:', form_id);

    // Étape 1: Créer ou mettre à jour le contact dès qu'un champ est rempli
    let contactId: string;

    if (contact_info.email) {
      // Vérifier si le contact existe déjà
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', contact_info.email)
        .single();

      if (existingContact) {
        contactId = existingContact.id;
        
        // Mettre à jour les informations du contact
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            first_name: contact_info.first_name || 'Anonyme',
            last_name: contact_info.last_name || '',
            phone: contact_info.phone,
            timezone: contact_info.timezone || 'UTC',
            utm_data: utm_data
          })
          .eq('id', contactId);

        if (updateError) throw updateError;
      } else {
        // Créer un nouveau contact
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            first_name: contact_info.first_name || 'Anonyme',
            last_name: contact_info.last_name || '',
            email: contact_info.email,
            phone: contact_info.phone,
            timezone: contact_info.timezone || 'UTC',
            utm_data: utm_data,
            status: 'opportunity',
            created_by: (await supabase.from('forms').select('created_by').eq('id', form_id).single()).data?.created_by
          })
          .select()
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;
      }
    } else {
      throw new Error('Email requis pour créer le contact');
    }

    // Étape 2: Enregistrer les réponses du formulaire
    const formResponses = responses.map(response => ({
      form_id,
      contact_id: contactId,
      question_id: response.question_id,
      response: response.response
    }));

    const { error: responsesError } = await supabase
      .from('form_responses')
      .insert(formResponses);

    if (responsesError) throw responsesError;

    // Étape 3: Récupérer les règles de disqualification
    const { data: form } = await supabase
      .from('forms')
      .select('disqualif_logic')
      .eq('id', form_id)
      .single();

    let isQualified = true;
    let disqualificationReason = '';

    if (form?.disqualif_logic) {
      // Appliquer les règles de disqualification
      const rules = form.disqualif_logic;
      
      for (const rule of rules.rules || []) {
        const userResponse = responses.find(r => r.question_id === rule.question_id);
        
        if (userResponse) {
          switch (rule.operator) {
            case 'equals':
              if (userResponse.response === rule.value) {
                isQualified = false;
                disqualificationReason = rule.message || 'Critères non respectés';
              }
              break;
            case 'contains':
              if (userResponse.response.toLowerCase().includes(rule.value.toLowerCase())) {
                isQualified = false;
                disqualificationReason = rule.message || 'Critères non respectés';
              }
              break;
            case 'less_than':
              if (parseInt(userResponse.response) < parseInt(rule.value)) {
                isQualified = false;
                disqualificationReason = rule.message || 'Critères non respectés';
              }
              break;
          }
        }
        
        if (!isQualified) break;
      }
    }

    // Étape 4: Mettre à jour le statut du contact
    const newStatus = isQualified ? 'lead' : 'disqualified';
    
    const { error: statusError } = await supabase
      .from('contacts')
      .update({ status: newStatus })
      .eq('id', contactId);

    if (statusError) throw statusError;

    console.log('Lead qualification completed:', {
      contact_id: contactId,
      qualified: isQualified,
      reason: disqualificationReason
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        contact_id: contactId,
        qualified: isQualified,
        disqualification_reason: disqualificationReason,
        redirect_url: isQualified ? null : form?.disqualif_logic?.redirect_url
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in lead form qualification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});