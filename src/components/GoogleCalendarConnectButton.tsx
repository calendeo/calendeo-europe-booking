import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoogleCalendar } from '@/hooks/use-google-calendar';

interface GoogleCalendarConnectButtonProps {
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const GoogleCalendarConnectButton: React.FC<GoogleCalendarConnectButtonProps> = ({ 
  variant = 'primary',
  className 
}) => {
  const { getOAuthUrl } = useGoogleCalendar();

  const handleConnect = () => {
    window.location.href = getOAuthUrl();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleConnect}
            variant={variant === 'primary' ? 'default' : 'secondary'}
            className={className}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Connecter mon agenda Google
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connexion requise pour synchroniser vos disponibilités et vos événements automatiquement.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};