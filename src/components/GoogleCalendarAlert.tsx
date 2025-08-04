import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GoogleCalendarConnectButton } from './GoogleCalendarConnectButton';

export const GoogleCalendarAlert: React.FC = () => {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex flex-col gap-3">
          <p>
            Pour continuer la création de votre événement, vous devez connecter un calendrier Google et enregistrer vos disponibilités.
          </p>
          <GoogleCalendarConnectButton variant="secondary" />
        </div>
      </AlertDescription>
    </Alert>
  );
};