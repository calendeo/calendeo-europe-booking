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
  const { getOAuthUrl, isConnected: hookConnected } = useGoogleCalendar();
  
  const connected = isConnected || hookConnected;

  const handleConnect = () => {
    window.location.href = getOAuthUrl();
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