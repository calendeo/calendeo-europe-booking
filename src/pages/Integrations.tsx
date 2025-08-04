import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, Video, ExternalLink } from 'lucide-react';

interface Integration {
  id: string;
  user_id: string;
  provider: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  provider: string;
  available: boolean;
}

const Integrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const availableIntegrations: IntegrationConfig[] = [
    {
      id: 'google',
      name: 'Google Calendar',
      description: 'Synchronisez vos événements avec Google Calendar.',
      icon: Calendar,
      provider: 'google',
      available: true,
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Connectez votre calendrier Outlook.',
      icon: Calendar,
      provider: 'outlook',
      available: false,
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Créez automatiquement des liens de réunion Zoom.',
      icon: Video,
      provider: 'zoom',
      available: false,
    },
  ];

  useEffect(() => {
    fetchConnectedIntegrations();
  }, [user]);

  const fetchConnectedIntegrations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnectedIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les intégrations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (provider: string) => {
    return connectedIntegrations.some((integration) => integration.provider === provider);
  };

  const handleGoogleConnect = async () => {
    setActionLoading('google');
    
    try {
      // In a real implementation, you would redirect to Google OAuth
      // For now, we'll simulate a successful connection
      const { error } = await supabase
        .from('user_integrations')
        .insert({
          user_id: user?.id,
          provider: 'google',
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        });

      if (error) throw error;

      await fetchConnectedIntegrations();
      toast({
        title: 'Succès',
        description: 'Google Calendar connecté avec succès.',
      });
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de connecter Google Calendar.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    setActionLoading(provider);
    
    try {
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user?.id)
        .eq('provider', provider);

      if (error) throw error;

      await fetchConnectedIntegrations();
      toast({
        title: 'Succès',
        description: `${provider === 'google' ? 'Google Calendar' : provider} déconnecté avec succès.`,
      });
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déconnecter cette intégration.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (integration: IntegrationConfig) => {
    if (!integration.available) return;

    const connected = isConnected(integration.provider);
    
    if (connected) {
      await handleDisconnect(integration.provider);
    } else {
      if (integration.provider === 'google') {
        await handleGoogleConnect();
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Intégrations</h1>
            <p className="text-muted-foreground mt-2">
              Connectez vos outils favoris pour automatiser votre workflow.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Intégrations</h1>
          <p className="text-muted-foreground mt-2">
            Connectez vos outils favoris pour automatiser votre workflow.
          </p>
        </div>

        {/* Available Integrations */}
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">Intégrations disponibles</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integration) => {
              const connected = isConnected(integration.provider);
              const Icon = integration.icon;
              const isLoading = actionLoading === integration.provider;

              return (
                <Card key={integration.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {connected ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                              Connecté
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Non connecté
                            </Badge>
                          )}
                          {!integration.available && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Bientôt disponible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {integration.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    {integration.available ? (
                      <Button
                        onClick={() => handleAction(integration)}
                        disabled={isLoading}
                        variant={connected ? "outline" : "default"}
                        className="w-full"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            {connected ? 'Déconnexion...' : 'Connexion...'}
                          </div>
                        ) : (
                          <>
                            {connected ? 'Déconnecter' : 'Connecter'}
                            {!connected && <ExternalLink className="ml-2 h-4 w-4" />}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button disabled variant="outline" className="w-full">
                        Bientôt disponible
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Connected Integrations Info */}
        {connectedIntegrations.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4">Intégrations actives</h2>
            <div className="space-y-3">
              {connectedIntegrations.map((integration) => {
                const config = availableIntegrations.find(i => i.provider === integration.provider);
                if (!config) return null;

                return (
                  <div key={integration.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <config.icon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{config.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Connecté depuis le {new Date(integration.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                      Actif
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Integrations;