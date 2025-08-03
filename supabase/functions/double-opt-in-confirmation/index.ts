import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptInRequest {
  event_id?: string;
  confirmation_token?: string;
  action: 'send_confirmation' | 'validate_confirmation' | 'cleanup_expired';
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

    const { event_id, confirmation_token, action }: OptInRequest = await req.json();
    console.log('Double opt-in action:', action, { event_id, confirmation_token });

    switch (action) {
      case 'send_confirmation':
        if (!event_id) throw new Error('event_id requis pour send_confirmation');

        // Récupérer les détails de l'événement et du contact
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            contacts(first_name, last_name, email)
          `)
          .eq('id', event_id)
          .single();

        if (eventError) throw eventError;

        // Générer un token de confirmation unique
        const token = crypto.randomUUID();
        const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/double-opt-in-confirmation`;
        
        // Stocker le token temporairement (on pourrait utiliser une table temporaire ou Redis)
        // Pour cet exemple, on utilise une colonne JSON dans events
        const { error: updateError } = await supabase
          .from('events')
          .update({ 
            status: 'pending',
            // Stocker le token et l'expiration dans une colonne JSON temporaire
            calendar_link: JSON.stringify({
              original_link: event.calendar_link,
              confirmation_token: token,
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
            })
          })
          .eq('id', event_id);

        if (updateError) throw updateError;

        // Envoyer l'email de confirmation (si vous avez configuré Resend)
        const confirmationEmail = {
          to: event.contacts.email,
          subject: `Confirmez votre rendez-vous - ${event.name}`,
          html: `
            <h2>Confirmez votre rendez-vous</h2>
            <p>Bonjour ${event.contacts.first_name},</p>
            <p>Votre rendez-vous "${event.name}" a été réservé pour le ${new Date(event.date_time).toLocaleString('fr-FR')}.</p>
            <p>Veuillez confirmer en cliquant sur le lien ci-dessous dans les 15 minutes :</p>
            <a href="${confirmationUrl}?token=${token}&action=validate_confirmation" 
               style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Confirmer mon rendez-vous
            </a>
            <p>Si vous ne confirmez pas dans les 15 minutes, votre créneau sera automatiquement libéré.</p>
          `
        };

        // Log de l'email (remplacer par l'appel à votre service d'email)
        console.log('Email de confirmation à envoyer:', confirmationEmail);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email de confirmation envoyé',
            token: token
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );

      case 'validate_confirmation':
        if (!confirmation_token) throw new Error('confirmation_token requis');

        // Chercher l'événement avec ce token
        const { data: events, error: searchError } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'pending');

        if (searchError) throw searchError;

        let targetEvent = null;
        for (const evt of events) {
          try {
            const linkData = JSON.parse(evt.calendar_link);
            if (linkData.confirmation_token === confirmation_token) {
              // Vérifier l'expiration
              if (new Date() > new Date(linkData.expires_at)) {
                throw new Error('Token expiré');
              }
              targetEvent = { ...evt, linkData };
              break;
            }
          } catch (e) {
            // Ignorer les événements sans token
            continue;
          }
        }

        if (!targetEvent) {
          throw new Error('Token invalide ou expiré');
        }

        // Confirmer l'événement
        const { error: confirmError } = await supabase
          .from('events')
          .update({ 
            status: 'confirmed',
            calendar_link: targetEvent.linkData.original_link
          })
          .eq('id', targetEvent.id);

        if (confirmError) throw confirmError;

        // Déclencher les notifications de confirmation
        await supabase.functions.invoke('event-notifications', {
          body: { event_id: targetEvent.id, trigger: 'event_confirmed' }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Rendez-vous confirmé avec succès',
            event_id: targetEvent.id
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );

      case 'cleanup_expired':
        // Nettoyer les événements expirés (à appeler via cron)
        const { data: pendingEvents, error: pendingError } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'pending');

        if (pendingError) throw pendingError;

        let deletedCount = 0;
        for (const evt of pendingEvents) {
          try {
            const linkData = JSON.parse(evt.calendar_link);
            if (linkData.expires_at && new Date() > new Date(linkData.expires_at)) {
              // Supprimer l'événement expiré
              await supabase
                .from('events')
                .delete()
                .eq('id', evt.id);
              deletedCount++;
            }
          } catch (e) {
            // Ignorer les événements sans données d'expiration
            continue;
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `${deletedCount} événements expirés supprimés`
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
    console.error("Error in double opt-in confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});