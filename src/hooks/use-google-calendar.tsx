import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useGoogleCalendar = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);

  const checkConnection = async () => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    try {
      // Check both google_calendar_tokens and user's calendar_connected status
      const [tokensResult, userResult] = await Promise.all([
        supabase
          .from('google_calendar_tokens')
          .select('*')
          .eq('email', user.email)
          .maybeSingle(),
        supabase
          .from('users')
          .select('calendar_connected')
          .eq('email', user.email)
          .maybeSingle()
      ]);

      if (tokensResult.error) {
        console.error('Error checking Google Calendar tokens:', tokensResult.error);
      }
      
      if (userResult.error) {
        console.error('Error checking user calendar status:', userResult.error);
      }

      const hasTokens = !!tokensResult.data;
      const userConnected = userResult.data?.calendar_connected || false;
      
      // User is connected if they have tokens OR calendar_connected is true
      const connected = hasTokens || userConnected;
      
      setIsConnected(connected);
      setTokenData(tokensResult.data);
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, [user]);

  const getOAuthUrl = () => {
    return 'https://accounts.google.com/o/oauth2/v2/auth?client_id=688791541113-ah93qkvrdufodi468earvmht2k54si2n.apps.googleusercontent.com&redirect_uri=https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/google-oauth-callback&response_type=code&scope=email%20https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent';
  };

  return {
    isConnected,
    isLoading,
    tokenData,
    checkConnection,
    getOAuthUrl
  };
};