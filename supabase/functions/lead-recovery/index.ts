import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadRecoveryRequest {
  action: 'detect_abandoned' | 'send_recovery' | 'process_scheduled';
  contact_id?: string;
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

    const { action, contact_id }: LeadRecoveryRequest = await req.json();
    console.log('Lead recovery action:', action, { contact_id });

    switch (action) {
      case 'detect_abandoned':
        // Détecter les leads abandonnés (formulaires commencés mais pas d'événement créé)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        
        // Trouver les contacts qui ont des réponses de formulaire mais aucun événement
        const { data: abandonedLeads, error: abandonedError } = await supabase
          .from('contacts')
          .select(`
            *,
            form_responses(id, created_at),
            events(id)
          `)
          .not('form_responses', 'is', null)
          .is('events', null)
          .not('email', 'is', null)
          .lte('created_at', twoHoursAgo.toISOString());

        if (abandonedError) throw abandonedError;

        console.log(`Détecté ${abandonedLeads.length} leads abandonnés`);

        // Marquer les contacts comme abandonnés et programmer les relances
        for (const contact of abandonedLeads) {
          // Ajouter le tag "abandonné" aux données UTM
          const updatedUtmData = {
            ...contact.utm_data,
            tags: [...(contact.utm_data?.tags || []), 'abandonné'],
            abandoned_at: new Date().toISOString()
          };

          await supabase
            .from('contacts')
            .update({
              utm_data: updatedUtmData,
              status: 'opportunity' // Garder comme opportunity pour relance
            })
            .eq('id', contact.id);

          // Programmer les relances (2h après abandon et 24h après)
          const relance2h = new Date(Date.now() + 2 * 60 * 60 * 1000);
          const relance24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

          // Créer les notifications de relance
          const notifications = [
            {
              type: 'email',
              trigger: 'lead_recovery_2h',
              recipient: 'guest',
              content: `N'oubliez pas de finaliser votre réservation, ${contact.first_name} !`,
              timing: relance2h.toISOString(),
              created_by: contact.created_by
            },
            {
              type: 'email',
              trigger: 'lead_recovery_24h',
              recipient: 'guest',
              content: `Dernière chance de réserver votre créneau, ${contact.first_name}`,
              timing: relance24h.toISOString(),
              created_by: contact.created_by
            }
          ];

          await supabase
            .from('notifications')
            .insert(notifications);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            abandoned_leads_detected: abandonedLeads.length 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );

      case 'send_recovery':
        if (!contact_id) throw new Error('contact_id requis pour send_recovery');

        // Récupérer les informations du contact
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select(`
            *,
            form_responses(
              response,
              form_questions(label, type)
            )
          `)
          .eq('id', contact_id)
          .single();

        if (contactError) throw contactError;

        // Construire le lien de reprise du formulaire avec les données pré-remplies
        const formData = contact.form_responses.reduce((acc: any, response: any) => {
          acc[response.form_questions.label] = response.response;
          return acc;
        }, {});

        const resumeLink = `${Deno.env.get('SITE_URL')}/booking?contact=${contact_id}&prefill=${encodeURIComponent(JSON.stringify(formData))}`;

        // Préparer l'email de relance personnalisé
        const recoveryEmail = {
          to: contact.email,
          subject: `${contact.first_name}, finalisez votre réservation en 2 clics`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <h2>Bonjour ${contact.first_name},</h2>
              
              <p>Vous avez commencé à réserver un créneau mais n'avez pas terminé le processus.</p>
              
              <p>Bonne nouvelle : nous avons sauvegardé vos informations ! 
              Cliquez simplement sur le bouton ci-dessous pour reprendre là où vous vous êtes arrêté :</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resumeLink}" 
                   style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Finaliser ma réservation
                </a>
              </div>
              
              <p>Les créneaux se remplissent rapidement, ne tardez pas !</p>
              
              <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
              
              <p style="font-size: 12px; color: #666;">
                Vous recevez cet email car vous avez commencé une réservation sur notre plateforme.
                Si vous ne souhaitez plus recevoir ces rappels, 
                <a href="${Deno.env.get('SITE_URL')}/unsubscribe?email=${contact.email}">cliquez ici</a>.
              </p>
            </div>
          `
        };

        // Log de l'email (remplacer par l'appel à votre service d'email)
        console.log('Email de relance à envoyer:', recoveryEmail);

        // Mettre à jour la date de dernière relance
        await supabase
          .from('contacts')
          .update({
            utm_data: {
              ...contact.utm_data,
              last_recovery_sent: new Date().toISOString()
            }
          })
          .eq('id', contact_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email de relance envoyé',
            resume_link: resumeLink
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );

      case 'process_scheduled':
        // Traiter les relances programmées (à appeler via cron)
        const now = new Date();
        const in5Minutes = new Date(now.getTime() + 5 * 60 * 1000);

        const { data: scheduledRecoveries, error: scheduleError } = await supabase
          .from('notifications')
          .select(`
            *,
            events(contacts(*))
          `)
          .in('trigger', ['lead_recovery_2h', 'lead_recovery_24h'])
          .not('timing', 'is', null)
          .gte('timing', now.toISOString())
          .lte('timing', in5Minutes.toISOString());

        if (scheduleError) throw scheduleError;

        for (const recovery of scheduledRecoveries) {
          if (recovery.events?.contacts) {
            // Envoyer la relance
            await supabase.functions.invoke('lead-recovery', {
              body: { 
                action: 'send_recovery', 
                contact_id: recovery.events.contacts.id 
              }
            });

            // Marquer la notification comme traitée
            await supabase
              .from('notifications')
              .update({ timing: null })
              .eq('id', recovery.id);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            processed: scheduledRecoveries.length 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );

      default:
        throw new Error('Action non reconnue');
    }

  } catch (error: any) {
    console.error("Error in lead recovery:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});