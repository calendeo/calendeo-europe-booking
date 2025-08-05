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

    console.log('OAuth callback received:', { code: code ? 'present' : 'missing' });

    // Check if code is present
    if (!code) {
      console.error('Missing authorization code');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    // Get environment variables
    const client_id = Deno.env.get('GOOGLE_CLIENT_ID');
    const client_secret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirect_uri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!client_id || !client_secret || !redirect_uri) {
      console.error('Missing Google OAuth credentials:', { 
        client_id: !!client_id, 
        client_secret: !!client_secret, 
        redirect_uri: !!redirect_uri 
      });
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
        code: code,
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', { status: tokenResponse.status, error: errorText });
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    const { access_token, refresh_token, expires_in, token_type } = tokenData;

    if (!access_token) {
      console.error('No access token received');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    // Get user info using access_token
    console.log('Fetching user info...');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('Failed to fetch user info:', { status: userInfoResponse.status, error: errorText });
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    const userInfo = await userInfoResponse.json();
    console.log('User info fetched:', { email: userInfo.email });

    const { email } = userInfo;

    if (!email) {
      console.error('No email received from Google userinfo');
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store tokens in database
    console.log('Storing tokens in database...');
    const { error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        email: email,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
        provider: 'google',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email',
      });

    if (tokenError) {
      console.error('Failed to store tokens:', tokenError);
      return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
    }

    console.log('Tokens stored successfully');

    // Update user's calendar_connected status
    console.log('Updating user calendar_connected status...');
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ calendar_connected: true })
      .eq('email', email);

    if (userUpdateError) {
      console.error('Error updating user calendar_connected status:', userUpdateError);
      // Don't fail the flow for this error, continue with success
    } else {
      console.log('User calendar_connected status updated successfully');
    }

    // Redirect to success page
    console.log('Redirecting to success page');
    return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-success', 302);

  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    return Response.redirect('https://calendeo.lovable.app/dashboard?auth=google-error', 302);
  }
});