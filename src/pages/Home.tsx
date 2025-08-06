import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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

interface Event {
  id: string;
  name: string;
  duration: number;
  type: string;
  status: string;
  created_at: string;
  host_ids: string[];
}

const Home = () => {
  const { user, loading } = useAuth();
  const { isConnected: googleConnected, isLoading: googleLoading } = useGoogleCalendar();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Check for Google auth status in URL params and redirect to dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    
    if (authStatus === 'google-success' || authStatus === 'google-error') {
      // Redirect to dashboard to handle auth status properly
      window.location.replace(`/dashboard?auth=${authStatus}`);
    }
  }, []);

  const fetchEvents = async () => {
    try {
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

  const handleEventCreated = () => {
    setShowCreateModal(false);
    fetchEvents();
    toast({
      title: 'Succès',
      description: 'Événement créé avec succès !',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <div>
        <DashboardHeader />
        
        {/* Google Calendar Integration Section */}
        <div className="mt-6 mb-8 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Intégration calendrier</h2>
              <p className="text-sm text-muted-foreground">
                Connectez votre agenda Google pour synchroniser vos disponibilités
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
          onEventCreated={handleEventCreated}
        />

        <ShareEventModal 
          open={showShareModal}
          onOpenChange={setShowShareModal}
          event={selectedEvent}
        />
      </div>
    </AppLayout>
  );
};

export default Home;