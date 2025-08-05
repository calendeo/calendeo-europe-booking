import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('OAuth callback received:', { code: code ? 'present' : 'missing', state });

    if (!code) {
      console.error('Missing authorization code');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!client_secret) {
      console.error('Missing GOOGLE_CLIENT_SECRET environment variable');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: '688791541113-ah93qkvrdufodi468earvmht2k54si2n.apps.googleusercontent.com',
        client_secret: client_secret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://calendeo.lovable.app/api/oauth/callback',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      console.error('No access token received');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    // Get user info
    console.log('Fetching user info...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('Failed to fetch user info:', errorText);
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    const userInfo = await userInfoResponse.json();
    console.log('User info fetched:', { email: userInfo.email });

    const { email } = userInfo;

    if (!email) {
      console.error('No email received from Google');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate expires_at
    const expires_at = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Insert or update tokens in database
    console.log('Storing tokens in database...');
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        email: email,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expires_at,
        provider: 'google',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email',
      });

    if (error) {
      console.error('Database error:', error);
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    console.log('Tokens stored successfully');

    // Update user's google_connected status
    console.log('Updating user google_connected status...');
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ calendar_connected: true })
      .eq('email', email);

    if (userUpdateError) {
      console.error('Error updating user status:', userUpdateError);
      // Don't fail the flow for this error, just log it
    }

    // Redirect to success page
    return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-success', 302);

  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
  }
});