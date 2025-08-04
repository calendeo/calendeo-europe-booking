import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Search, Plus, Clock, Users, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isAfter, isBefore, isToday, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  type: string;
  status: string;
  date_time: string;
  duration: number;
  timezone: string;
  host_ids: string[];
  guest_id: string;
  created_by: string;
  location: string;
  contacts?: {
    first_name: string;
    last_name: string;
  };
}

interface GroupedEvents {
  [date: string]: Event[];
}

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  useEffect(() => {
    filterEvents();
  }, [events, activeTab, searchQuery]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Get current user's ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          contacts:guest_id (
            first_name,
            last_name
          )
        `)
        .or(`created_by.eq.${userData.id},host_ids.cs.{${userData.id}}`);

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by tab
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        filtered = events.filter(event => 
          isAfter(parseISO(event.date_time), now) && event.status === 'confirmed'
        );
        break;
      case 'pending':
        filtered = events.filter(event => event.status === 'pending');
        break;
      case 'past':
        filtered = events.filter(event => 
          isBefore(parseISO(event.date_time), now)
        );
        break;
      default:
        filtered = events;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(query) ||
        event.type.toLowerCase().includes(query) ||
        (event.contacts?.first_name?.toLowerCase().includes(query)) ||
        (event.contacts?.last_name?.toLowerCase().includes(query))
      );
    }

    setFilteredEvents(filtered);
  };

  const groupEventsByDay = (events: Event[]): GroupedEvents => {
    return events.reduce((groups: GroupedEvents, event) => {
      const date = format(parseISO(event.date_time), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {});
  };

  const formatDayHeader = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  const formatTimeSlot = (dateTime: string, duration: number) => {
    const start = parseISO(dateTime);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    return `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: { label: 'Confirmé', variant: 'default' as const },
      pending: { label: 'En attente', variant: 'secondary' as const },
      cancelled: { label: 'Annulé', variant: 'destructive' as const },
    };

    const statusInfo = variants[status as keyof typeof variants] || variants.confirmed;
    
    return (
      <Badge variant={statusInfo.variant} className="text-xs">
        {statusInfo.label}
      </Badge>
    );
  };

  const getGuestName = (event: Event) => {
    if (event.contacts) {
      return `${event.contacts.first_name} ${event.contacts.last_name}`.trim();
    }
    return 'Invité';
  };

  const groupedEvents = groupEventsByDay(filteredEvents);
  const sortedDates = Object.keys(groupedEvents).sort();

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-6"></div>
            <div className="h-10 bg-muted rounded w-full mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Calendrier</h1>
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un contact, un événement, un tag…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="upcoming">À venir</TabsTrigger>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="past">Passés</TabsTrigger>
            <TabsTrigger value="daterange">Plage de dates</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Events Display */}
            {sortedDates.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucun événement trouvé.
                </h3>
                <p className="text-muted-foreground mb-6">
                  Créez votre premier événement pour commencer.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un événement
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedDates.map(date => (
                  <div key={date} className="space-y-4">
                    {/* Day Header */}
                    <h2 className="text-lg font-medium text-foreground capitalize">
                      {formatDayHeader(date)}
                    </h2>
                    
                    {/* Events for this day */}
                    <div className="space-y-3">
                      {groupedEvents[date].map(event => (
                        <Card key={event.id} className="hover:shadow-md transition-shadow duration-200">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              {/* Main Event Info */}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">
                                      {formatTimeSlot(event.date_time, event.duration)}
                                    </span>
                                  </div>
                                  {getStatusBadge(event.status)}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-foreground font-medium">
                                    {getGuestName(event)}
                                  </span>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  Type d'événement : <span className="font-medium">{event.type}</span>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                  {event.host_ids.length} organisateur{event.host_ids.length > 1 ? 's' : ''} | 0 non-organisateur
                                </div>

                                {event.location && event.location !== 'online' && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              <Button variant="outline" size="sm">
                                Détails
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Calendar;