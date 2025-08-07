import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, User, Calendar as CalendarIcon } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  duration: number;
  type: string;
  location: string;
  description?: string;
  slug?: string;
  host_ids: string[];
}

interface Host {
  id: string;
  first_name: string;
  last_name: string;
}

const BookEvent = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (eventSlug) {
      fetchEvent();
    }
  }, [eventSlug]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      
      // Try to find event by slug first, then by ID
      let { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', eventSlug)
        .single();

      if (error && error.code === 'PGRST116') {
        // If not found by slug, try by ID
        const { data: eventById, error: errorById } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventSlug)
          .single();
        
        if (errorById) throw errorById;
        eventData = eventById;
      } else if (error) {
        throw error;
      }

      if (!eventData) {
        throw new Error('Événement non trouvé');
      }

      setEvent(eventData);

      // Fetch host information
      if (eventData.host_ids && eventData.host_ids.length > 0) {
        const { data: hostsData, error: hostsError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', eventData.host_ids);

        if (hostsError) {
          console.error('Error fetching hosts:', hostsError);
        } else {
          setHosts(hostsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'événement.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateTimeSelect = (dateTime: Date) => {
    setSelectedDateTime(dateTime);
    setShowLeadForm(true);
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

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Événement introuvable</h1>
          <p className="text-muted-foreground">L'événement que vous recherchez n'existe pas ou n'est plus disponible.</p>
        </div>
      </div>
    );
  }

  const getLocationDisplay = (location: string) => {
    const locationMap: { [key: string]: string } = {
      'online': 'En ligne',
      'phone': 'Par téléphone',
      'in_person': 'En personne',
      'physical': 'En personne',
      'custom': 'Lieu personnalisé'
    };
    return locationMap[location] || location;
  };

  const getTypeDisplay = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'consultation': 'Consultation',
      'meeting': 'Réunion',
      'demo': 'Démonstration',
      'interview': 'Entretien',
      '1v1': 'Rendez-vous individuel'
    };
    return typeMap[type] || type;
  };

  if (showLeadForm && selectedDateTime) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-4">
            <button
              onClick={() => setShowLeadForm(false)}
              className="text-primary hover:text-primary-dark transition-colors"
            >
              ← Retour à la sélection de créneaux
            </button>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">{event.name}</h1>
            <p className="text-muted-foreground">
              Créneau sélectionné : {selectedDateTime.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="text-center text-muted-foreground">
              Fonctionnalité de réservation en cours de développement
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Event Header */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">
              {event.name}
            </CardTitle>
            <CardDescription className="text-base">
              {event.description || 'Réservez votre créneau pour cet événement'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {event.duration} minutes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {getLocationDisplay(event.location)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {getTypeDisplay(event.type)}
                </span>
              </div>
            </div>
            
            {hosts.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Animé par :</p>
                <div className="flex flex-wrap gap-2">
                  {hosts.map((host) => (
                    <span
                      key={host.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      {host.first_name} {host.last_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Choisissez votre créneau</CardTitle>
            <CardDescription>
              Sélectionnez la date et l'heure qui vous conviennent le mieux
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Sélectionnez votre créneau</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choisissez une date et une heure pour votre {event.name}
                </p>
                <button
                  onClick={() => handleDateTimeSelect(new Date())}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Réserver maintenant (Démo)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookEvent;