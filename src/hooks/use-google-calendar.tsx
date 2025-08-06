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
      console.log('🔍 Checking Google Calendar connection for user:', user.email);
      
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
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      console.log('📊 Tokens result:', tokensResult);
      console.log('👤 User result:', userResult);

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
      
      console.log('✅ Google Calendar connection status:', {
        hasTokens,
        userConnected,
        finalStatus: connected
      });
      
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

  // ⚠️ DEPRECATED: URL OAuth directement intégrée dans les boutons pour éviter les problèmes de cache
  // L'URL OAuth est maintenant hardcodée directement dans chaque bouton
  
  return {
    isConnected,
    isLoading,
    tokenData,
    checkConnection
  };
};