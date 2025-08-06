import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoogleCalendar } from '@/hooks/use-google-calendar';

interface GoogleCalendarConnectButtonProps {
  variant?: 'primary' | 'secondary';
  className?: string;
  isConnected?: boolean;
}

export const GoogleCalendarConnectButton: React.FC<GoogleCalendarConnectButtonProps> = ({ 
  variant = 'primary',
  className,
  isConnected = false
}) => {
  const { isConnected: hookConnected } = useGoogleCalendar();
  
  const connected = isConnected || hookConnected;

  const handleConnect = () => {
    // Utilisation directe de l'URL pour éviter tout problème de cache ou variable
    // IMPORTANT: Ne jamais changer cette URL sans mettre à jour Google Cloud Console
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=688791541113-ah93qkvrdufodi468earvmht2k54si2n.apps.googleusercontent.com&redirect_uri=https://qbrgdxzbluzpsgsrhtst.supabase.co/functions/v1/google-oauth-callback&response_type=code&scope=email%20https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent';
    
    // Log de debug pour vérifier l'URL utilisée
    console.log('🚀 OAuth URL utilisée:', oauthUrl);
    console.log('🔍 Redirect URI dans l\'URL:', new URLSearchParams(oauthUrl.split('?')[1]).get('redirect_uri'));
    
    // Force refresh pour éviter le cache
    window.location.replace(oauthUrl);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={connected ? undefined : handleConnect}
            variant={connected ? 'secondary' : (variant === 'primary' ? 'default' : 'secondary')}
            className={className}
            disabled={connected}
          >
            {connected ? (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                ✅ Connecté à Google Calendar
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Connecter mon agenda Google
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {connected ? (
            <p>Votre agenda Google est connecté et synchronisé.</p>
          ) : (
            <p>Connexion requise pour synchroniser vos disponibilités et vos événements automatiquement.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};