import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, Copy, ChevronDown, Save, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeSlot {
  id?: string;
  start_time: string;
  end_time: string;
}

interface DayAvailability {
  weekday: number;
  slots: TimeSlot[];
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lundi', shortName: 'Lun' },
  { id: 2, name: 'Mardi', shortName: 'Mar' },
  { id: 3, name: 'Mercredi', shortName: 'Mer' },
  { id: 4, name: 'Jeudi', shortName: 'Jeu' },
  { id: 5, name: 'Vendredi', shortName: 'Ven' },
  { id: 6, name: 'Samedi', shortName: 'Sam' },
  { id: 0, name: 'Dimanche', shortName: 'Dim' },
];

const Availability = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [availability, setAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map(day => ({ weekday: day.id, slots: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openDays, setOpenDays] = useState<number[]>([]);

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user]);

  const fetchAvailability = async () => {
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
        .from('availability_slots')
        .select('*')
        .eq('user_id', userData.id)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching availability:', error);
        return;
      }

      // Group slots by weekday
      const groupedSlots = DAYS_OF_WEEK.map(day => {
        const daySlots = (data || [])
          .filter(slot => slot.weekday === day.id)
          .map(slot => ({
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
          }));
        
        return {
          weekday: day.id,
          slots: daySlots,
        };
      });

      setAvailability(groupedSlots);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = (weekday: number) => {
    setAvailability(prev => 
      prev.map(day => 
        day.weekday === weekday 
          ? { 
              ...day, 
              slots: [...day.slots, { start_time: '09:00', end_time: '17:00' }] 
            }
          : day
      )
    );
  };

  const updateTimeSlot = (weekday: number, slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setAvailability(prev => 
      prev.map(day => 
        day.weekday === weekday 
          ? {
              ...day,
              slots: day.slots.map((slot, index) => 
                index === slotIndex 
                  ? { ...slot, [field]: value }
                  : slot
              )
            }
          : day
      )
    );
  };

  const removeTimeSlot = (weekday: number, slotIndex: number) => {
    setAvailability(prev => 
      prev.map(day => 
        day.weekday === weekday 
          ? {
              ...day,
              slots: day.slots.filter((_, index) => index !== slotIndex)
            }
          : day
      )
    );
  };

  const copyToAllDays = (sourceWeekday: number) => {
    const sourceDay = availability.find(day => day.weekday === sourceWeekday);
    if (!sourceDay) return;

    setAvailability(prev => 
      prev.map(day => ({
        ...day,
        slots: [...sourceDay.slots.map(slot => ({ ...slot, id: undefined }))]
      }))
    );

    toast({
      title: "Disponibilités copiées",
      description: "Les créneaux ont été copiés sur tous les jours.",
    });
  };

  const saveAvailability = async () => {
    try {
      setSaving(true);

      // Get current user's ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userData) return;

      // Delete existing availability slots
      await supabase
        .from('availability_slots')
        .delete()
        .eq('user_id', userData.id);

      // Insert new availability slots
      const slotsToInsert = availability.flatMap(day => 
        day.slots.map(slot => ({
          user_id: userData.id,
          weekday: day.weekday,
          start_time: slot.start_time,
          end_time: slot.end_time,
          timezone: 'UTC',
        }))
      );

      if (slotsToInsert.length > 0) {
        const { error } = await supabase
          .from('availability_slots')
          .insert(slotsToInsert);

        if (error) {
          console.error('Error saving availability:', error);
          toast({
            title: "Erreur",
            description: "Une erreur est survenue lors de la sauvegarde.",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Succès",
        description: "Vos disponibilités ont été mises à jour avec succès.",
      });

      // Refresh data
      await fetchAvailability();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (weekday: number) => {
    setOpenDays(prev => 
      prev.includes(weekday) 
        ? prev.filter(day => day !== weekday)
        : [...prev, weekday]
    );
  };

  const renderTimeSlots = (day: DayAvailability) => (
    <div className="space-y-3">
      {day.slots.map((slot, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground">De</span>
            <Input
              type="time"
              value={slot.start_time}
              onChange={(e) => updateTimeSlot(day.weekday, index, 'start_time', e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">à</span>
            <Input
              type="time"
              value={slot.end_time}
              onChange={(e) => updateTimeSlot(day.weekday, index, 'end_time', e.target.value)}
              className="w-auto"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeTimeSlot(day.weekday, index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addTimeSlot(day.weekday)}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une plage horaire
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToAllDays(day.weekday)}
          className="flex-1"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copier sur tous les jours
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
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
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Disponibilités</h1>
            <p className="text-muted-foreground mt-1">
              Configurez vos créneaux de disponibilité pour les réservations.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="availability" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Disponibilités
            </TabsTrigger>
            <TabsTrigger value="exceptions" disabled>
              Exceptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="availability" className="mt-6">
            <div className="space-y-4">
              {isMobile ? (
                // Mobile: Collapsible days
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map(dayInfo => {
                    const day = availability.find(d => d.weekday === dayInfo.id);
                    if (!day) return null;

                    return (
                      <Card key={dayInfo.id}>
                        <Collapsible
                          open={openDays.includes(dayInfo.id)}
                          onOpenChange={() => toggleDay(dayInfo.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                  {dayInfo.name}
                                  <span className="ml-2 text-sm text-muted-foreground font-normal">
                                    {day.slots.length} créneau{day.slots.length > 1 ? 'x' : ''}
                                  </span>
                                </CardTitle>
                                <ChevronDown className="h-4 w-4 transition-transform" />
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {renderTimeSlots(day)}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                // Desktop: Table layout
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map(dayInfo => {
                    const day = availability.find(d => d.weekday === dayInfo.id);
                    if (!day) return null;

                    return (
                      <Card key={dayInfo.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-3">
                            {dayInfo.name}
                            <span className="text-sm text-muted-foreground font-normal">
                              {day.slots.length} créneau{day.slots.length > 1 ? 'x' : ''}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {renderTimeSlots(day)}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="exceptions" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Exceptions (Bientôt disponible)
                  </h3>
                  <p className="text-muted-foreground">
                    Configurez vos absences ou indisponibilités ponctuelles (vacances, jours fériés, etc.)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button 
            onClick={saveAvailability} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer mes disponibilités'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Availability;