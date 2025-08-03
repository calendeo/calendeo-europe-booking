import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoundRobinRequest {
  event_type: string;
  date_time: string;
  team_id?: string;
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

    const { event_type, date_time, team_id }: RoundRobinRequest = await req.json();
    console.log('Starting round robin attribution for:', { event_type, date_time, team_id });

    // Récupérer les utilisateurs disponibles
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        priority,
        calendar_connected,
        team_members!inner(team_id)
      `)
      .eq('active', true)
      .eq('calendar_connected', true);

    if (team_id) {
      usersQuery = usersQuery.eq('team_members.team_id', team_id);
    }

    const { data: availableUsers, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    if (!availableUsers || availableUsers.length === 0) {
      throw new Error('Aucun utilisateur disponible trouvé');
    }

    // Vérifier les disponibilités selon les créneaux configurés
    const eventDate = new Date(date_time);
    const weekday = eventDate.getDay();
    const eventTime = eventDate.toTimeString().slice(0, 5);

    const { data: availabilitySlots } = await supabase
      .from('availability_slots')
      .select('user_id')
      .eq('weekday', weekday)
      .lte('start_time', eventTime)
      .gte('end_time', eventTime)
      .in('user_id', availableUsers.map(u => u.id));

    const availableUserIds = availabilitySlots?.map(slot => slot.user_id) || [];
    const filteredUsers = availableUsers.filter(user => availableUserIds.includes(user.id));

    if (filteredUsers.length === 0) {
      throw new Error('Aucun utilisateur disponible pour ce créneau');
    }

    // Compter les événements récents (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userStats = await Promise.all(
      filteredUsers.map(async (user) => {
        // Compter les événements récents
        const { count: recentEvents } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .contains('host_ids', [user.id])
          .gte('created_at', thirtyDaysAgo.toISOString());

        // Récupérer le dernier événement assigné
        const { data: lastEvent } = await supabase
          .from('events')
          .select('created_at')
          .contains('host_ids', [user.id])
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...user,
          recent_events_count: recentEvents || 0,
          last_event_date: lastEvent?.[0]?.created_at || '1970-01-01'
        };
      })
    );

    // Algorithme Round-Robin : trier par priorité, puis équité
    const sortedUsers = userStats.sort((a, b) => {
      // 1. Priorité manuelle (plus faible = plus prioritaire)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // 2. Nombre de RDV récents (moins = plus prioritaire)
      if (a.recent_events_count !== b.recent_events_count) {
        return a.recent_events_count - b.recent_events_count;
      }
      
      // 3. Dernier RDV assigné (plus ancien = plus prioritaire)
      return new Date(a.last_event_date).getTime() - new Date(b.last_event_date).getTime();
    });

    const selectedUser = sortedUsers[0];

    console.log('User selected:', {
      user_id: selectedUser.id,
      priority: selectedUser.priority,
      recent_events: selectedUser.recent_events_count,
      last_event: selectedUser.last_event_date
    });

    // Envoyer notification Slack si configuré
    const { data: slackIntegration } = await supabase
      .from('integrations')
      .select('config')
      .eq('user_id', selectedUser.id)
      .eq('tool', 'slack')
      .eq('status', 'connected')
      .single();

    if (slackIntegration?.config?.webhook_url) {
      try {
        await fetch(slackIntegration.config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🎯 Nouveau RDV assigné: ${event_type} le ${new Date(date_time).toLocaleString('fr-FR')}`
          })
        });
      } catch (slackError) {
        console.warn('Erreur notification Slack:', slackError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        assigned_user_id: selectedUser.id,
        priority: selectedUser.priority,
        stats: {
          recent_events: selectedUser.recent_events_count,
          last_event: selectedUser.last_event_date
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in round robin attribution:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});