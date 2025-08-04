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
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error checking Google Calendar connection:', error);
        setIsConnected(false);
      } else {
        setIsConnected(!!data);
        setTokenData(data);
      }
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
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: '688791541113-ah93qkvrdufodi468earvmht2k54si2n.apps.googleusercontent.com',
      redirect_uri: 'https://calendeo.lovable.app/api/oauth/callback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  return {
    isConnected,
    isLoading,
    tokenData,
    checkConnection,
    getOAuthUrl
  };
};