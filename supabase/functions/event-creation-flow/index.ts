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
  timezone?: string;
  date_time?: string;
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
    
    console.log('🚀 Event creation started:', {
      eventName: eventData.name,
      eventType: eventData.type,
      hostCount: eventData.host_ids?.length || 0,
      timezone: eventData.timezone || 'UTC'
    });

    // Enhanced input validation
    const requiredFields = ['name', 'duration', 'host_ids', 'type'];
    const missingFields = requiredFields.filter(field => !eventData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate host_ids is array with content
    if (!Array.isArray(eventData.host_ids) || eventData.host_ids.length === 0) {
      throw new Error('host_ids must be a non-empty array');
    }

    // Normalize location enum
    let normalizedLocation: string = 'online'; // default safe value
    if (eventData.location) {
      const locationMap: { [key: string]: string } = {
        'online': 'online',
        'physical': 'physical', 
        'custom': 'custom',
        'google_meet': 'online',
        'zoom': 'online',
        'teams': 'online',
        'microsoft_teams': 'online',
        'phone': 'custom'
      };
      normalizedLocation = locationMap[eventData.location.toLowerCase()] || 'online';
    }
    console.log('🗺️ Location normalized:', eventData.location, '->', normalizedLocation);

    // Generate proper date_time
    let eventDateTime: string;
    if (eventData.date_time) {
      eventDateTime = new Date(eventData.date_time).toISOString();
    } else {
      eventDateTime = new Date().toISOString();
    }
    console.log('📅 Event date_time set to:', eventDateTime);

    // Generate slug from event name
    const generateSlug = (name: string): string => {
      const randomId = Math.random().toString(36).substring(2, 8);
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) + '-' + randomId;
    };
    
    const eventSlug = generateSlug(eventData.name);
    console.log('🔗 Generated slug:', eventSlug);

    // Create temporary contact - VERSION ULTRA MINIMALE
    const tempContactData = {
      first_name: 'Template',
      last_name: 'Guest', 
      email: `template-${Date.now()}@example.com`,
      created_by: currentUserId,
      status: 'opportunity',
      timezone: 'UTC'
    };

    console.log('📦 ULTRA MINIMAL Contact payload:', tempContactData);

    const { data: tempContact, error: contactError } = await supabase
      .from('contacts')
      .insert(tempContactData)
      .select()
      .single();

    if (contactError) {
      console.error('❌ DETAILED Contact creation error:', {
        message: contactError.message,
        details: contactError.details,
        hint: contactError.hint,
        code: contactError.code,
        payload: tempContactData
      });
      throw new Error(`Contact creation failed: ${contactError.message}`);
    }

    console.log('✅ Temporary contact created successfully:', tempContact.id);

    // Build event payload - SUPPRESSION COMPLÈTE de tous les champs pouvant causer des erreurs JSON
    const eventPayload = {
      name: eventData.name,
      type: eventData.type,
      duration: eventData.duration,
      host_ids: eventData.host_ids,
      location: normalizedLocation,
      date_time: eventDateTime,
      guest_id: tempContact.id,
      timezone: eventData.timezone || 'UTC',
      status: 'confirmed',
      created_by: currentUserId,
      color: eventData.color || '#1a6be3',
      slug: eventSlug
      // SUPPRESSION TOTALE de tous les autres champs pour éliminer les erreurs JSON
    };
    
    console.log('📦 SIMPLIFIED event payload:', eventPayload);
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventPayload)
      .select()
      .single();

    if (eventError) {
      console.error('❌ Event creation failed:', eventError);
      throw eventError;
    }

    console.log('✅ Event creation completed successfully:', event.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: event.id,
        event: event
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Event creation flow failed:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Event creation failed. Please check logs for details.",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});