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