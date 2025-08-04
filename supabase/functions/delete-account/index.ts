import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Delete account function called')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Initialize regular client to verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Starting account deletion for user: ${user.id}`)

    // Get the internal user ID
    const { data: internalUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching internal user:', userError)
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Internal user ID: ${internalUser.id}`)

    // Delete data in the correct order (reverse of dependencies)
    
    // 1. Delete form responses for events created by this user
    console.log('Deleting form responses...')
    const { error: formResponsesError } = await supabaseAdmin
      .from('form_responses')
      .delete()
      .in('form_id', 
        supabaseAdmin
          .from('forms')
          .select('id')
          .eq('created_by', internalUser.id)
      )

    if (formResponsesError) {
      console.error('Error deleting form responses:', formResponsesError)
    }

    // 2. Delete notifications for events created by this user
    console.log('Deleting notifications...')
    const { error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('created_by', internalUser.id)

    if (notificationsError) {
      console.error('Error deleting notifications:', notificationsError)
    }

    // 3. Delete disqualifications for events created by this user
    console.log('Deleting disqualifications...')
    const { error: disqualificationsError } = await supabaseAdmin
      .from('disqualifications')
      .delete()
      .eq('created_by', internalUser.id)

    if (disqualificationsError) {
      console.error('Error deleting disqualifications:', disqualificationsError)
    }

    // 4. Delete form questions for forms created by this user
    console.log('Deleting form questions...')
    const { error: formQuestionsError } = await supabaseAdmin
      .from('form_questions')
      .delete()
      .in('form_id',
        supabaseAdmin
          .from('forms')
          .select('id')
          .eq('created_by', internalUser.id)
      )

    if (formQuestionsError) {
      console.error('Error deleting form questions:', formQuestionsError)
    }

    // 5. Delete forms created by this user
    console.log('Deleting forms...')
    const { error: formsError } = await supabaseAdmin
      .from('forms')
      .delete()
      .eq('created_by', internalUser.id)

    if (formsError) {
      console.error('Error deleting forms:', formsError)
    }

    // 6. Delete events created by this user
    console.log('Deleting events...')
    const { error: eventsError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('created_by', internalUser.id)

    if (eventsError) {
      console.error('Error deleting events:', eventsError)
    }

    // 7. Delete contacts created by this user
    console.log('Deleting contacts...')
    const { error: contactsError } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('created_by', internalUser.id)

    if (contactsError) {
      console.error('Error deleting contacts:', contactsError)
    }

    // 8. Delete analytics data
    console.log('Deleting analytics...')
    const { error: analyticsError } = await supabaseAdmin
      .from('analytics')
      .delete()
      .eq('user_id', internalUser.id)

    if (analyticsError) {
      console.error('Error deleting analytics:', analyticsError)
    }

    // 9. Delete availability slots
    console.log('Deleting availability slots...')
    const { error: availabilityError } = await supabaseAdmin
      .from('availability_slots')
      .delete()
      .eq('user_id', internalUser.id)

    if (availabilityError) {
      console.error('Error deleting availability slots:', availabilityError)
    }

    // 10. Delete integrations
    console.log('Deleting integrations...')
    const { error: integrationsError } = await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('user_id', internalUser.id)

    if (integrationsError) {
      console.error('Error deleting integrations:', integrationsError)
    }

    // 11. Delete user integrations
    console.log('Deleting user integrations...')
    const { error: userIntegrationsError } = await supabaseAdmin
      .from('user_integrations')
      .delete()
      .eq('user_id', internalUser.id)

    if (userIntegrationsError) {
      console.error('Error deleting user integrations:', userIntegrationsError)
    }

    // 12. Delete team memberships
    console.log('Deleting team memberships...')
    const { error: teamMembersError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', internalUser.id)

    if (teamMembersError) {
      console.error('Error deleting team memberships:', teamMembersError)
    }

    // 13. Delete teams created by this user (only if no other members)
    console.log('Deleting teams without other members...')
    const { data: userTeams } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('created_by', internalUser.id)

    if (userTeams) {
      for (const team of userTeams) {
        const { data: teamMembers } = await supabaseAdmin
          .from('team_members')
          .select('id')
          .eq('team_id', team.id)

        if (!teamMembers || teamMembers.length === 0) {
          await supabaseAdmin
            .from('teams')
            .delete()
            .eq('id', team.id)
        }
      }
    }

    // 14. Delete user preferences (will cascade due to foreign key)
    console.log('Deleting user preferences...')
    const { error: preferencesError } = await supabaseAdmin
      .from('user_preferences')
      .delete()
      .eq('id', internalUser.id)

    if (preferencesError) {
      console.error('Error deleting user preferences:', preferencesError)
    }

    // 15. Delete the internal user record
    console.log('Deleting internal user record...')
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', internalUser.id)

    if (deleteUserError) {
      console.error('Error deleting internal user:', deleteUserError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la suppression des données utilisateur' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // 16. Finally, delete the auth user (this will trigger cascading deletes)
    console.log('Deleting auth user...')
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteAuthUserError) {
      console.error('Error deleting auth user:', deleteAuthUserError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la suppression du compte' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Successfully deleted account for user: ${user.id}`)

    return new Response(
      JSON.stringify({ message: 'Compte supprimé avec succès' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error during account deletion:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue lors de la suppression du compte' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})