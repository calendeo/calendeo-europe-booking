import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EventsSection } from '@/components/dashboard/EventsSection';
import { CreateEventModal } from '@/components/dashboard/CreateEventModal';
import { ShareEventModal } from '@/components/dashboard/ShareEventModal';
import { useGoogleCalendar } from '@/hooks/use-google-calendar';
import { GoogleCalendarConnectButton } from '@/components/GoogleCalendarConnectButton';
import { GoogleCalendarBadge } from '@/components/GoogleCalendarBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  duration: number;
  type: string;
  status: string;
  created_at: string;
  host_ids: string[];
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { isConnected: googleConnected, isLoading: googleLoading, checkConnection } = useGoogleCalendar();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Check for Google auth status in URL params
  useEffect(() => {
    const authStatus = searchParams.get('auth');
    
    if (authStatus === 'google-success') {
      toast({
        title: '🎉 Connexion Google réussie !',
        description: 'Votre agenda Google est maintenant connecté et synchronisé.',
      });
      
      // Re-check Google Calendar connection status
      checkConnection();
      
      // Clean up URL params after 100ms to avoid re-triggering
      setTimeout(() => {
        setSearchParams(params => {
          params.delete('auth');
          return params;
        });
      }, 100);
    } else if (authStatus === 'google-error') {
      toast({
        title: '❌ Erreur de connexion Google',
        description: 'Impossible de connecter votre agenda Google. Veuillez réessayer.',
        variant: 'destructive',
      });
      
      // Clean up URL params after 100ms
      setTimeout(() => {
        setSearchParams(params => {
          params.delete('auth');
          return params;
        });
      }, 100);
    }
  }, [searchParams, toast, checkConnection, setSearchParams]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les événements.',
        variant: 'destructive',
      });
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setShowCreateModal(true);
  };

  const handleShareEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowShareModal(true);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <div>
        <DashboardHeader />
        
        {/* Google Calendar Connection Status Alert */}
        {!googleLoading && (
          <div className="mt-6 mb-8 px-6">
            {googleConnected ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-center justify-between">
                    <span>
                      🟢 <strong>Connecté à Google Calendar</strong> - Votre agenda est synchronisé automatiquement.
                    </span>
                    <GoogleCalendarBadge />
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-orange-200 bg-orange-50">
                <XCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="flex flex-col gap-3">
                    <span>
                      🔴 <strong>Non connecté à Google Calendar</strong> - Connectez votre agenda pour synchroniser vos disponibilités automatiquement.
                    </span>
                    <GoogleCalendarConnectButton variant="secondary" />
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Google Calendar Integration Section */}
        <div className="mt-6 mb-8 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Synchronisation d'agenda
              </h2>
              <p className="text-sm text-muted-foreground">
                Connectez votre agenda Google pour synchroniser automatiquement vos disponibilités.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {!googleLoading && (
                googleConnected ? (
                  <GoogleCalendarBadge />
                ) : (
                  <GoogleCalendarConnectButton />
                )
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <EventsSection 
            events={events}
            loading={eventsLoading}
            onCreateEvent={handleCreateEvent}
            onShareEvent={handleShareEvent}
          />
        </div>

        <CreateEventModal 
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onEventCreated={fetchEvents}
        />

        {selectedEvent && (
          <ShareEventModal 
            event={selectedEvent}
            open={showShareModal}
            onOpenChange={setShowShareModal}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;