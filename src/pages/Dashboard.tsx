import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
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

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
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
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <EventsSection 
          events={events}
          loading={loading}
          onCreateEvent={handleCreateEvent}
          onShareEvent={handleShareEvent}
        />
      </main>

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
  );
};

export default Dashboard;