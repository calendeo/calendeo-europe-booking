import React from 'react';
import { Plus, Calendar, Clock, Globe, Link, Share2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  name: string;
  duration: number;
  type: string;
  status: string;
  created_at: string;
  host_ids: string[];
}

interface EventsSectionProps {
  events: Event[];
  loading: boolean;
  onCreateEvent: () => void;
  onShareEvent: (event: Event) => void;
}

export const EventsSection: React.FC<EventsSectionProps> = ({
  events,
  loading,
  onCreateEvent,
  onShareEvent,
}) => {
  const navigate = useNavigate();
  const copyEventLink = (eventId: string) => {
    const link = `${window.location.origin}/book/${eventId}`;
    navigator.clipboard.writeText(link);
  };

  const previewEvent = (eventId: string) => {
    window.open(`/book/${eventId}`, '_blank');
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Mes événements</h2>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">Mes événements</h2>
        <Button onClick={() => navigate('/create-event')} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un événement
        </Button>
        </div>

        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                Créez votre premier événement
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Configurez les détails de votre événement, ajoutez des hôtes et gérez vos paramètres de planification.
              </p>
            </div>
            <Button onClick={() => navigate('/create-event')} size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Créer un événement
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Mes événements</h2>
        <Button onClick={() => navigate('/create-event')} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un événement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{event.name}</CardTitle>
                <Badge variant={event.status === 'confirmed' ? 'default' : 'secondary'}>
                  {event.status === 'confirmed' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {event.duration} min
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {event.type}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => previewEvent(event.id)}
                >
                  <Eye className="h-3 w-3" />
                  Afficher
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => copyEventLink(event.id)}
                >
                  <Link className="h-3 w-3" />
                  Copier
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => onShareEvent(event)}
                >
                  <Share2 className="h-3 w-3" />
                  Partager
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};