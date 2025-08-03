import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isSameDay, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingCalendarProps {
  isEnabled: boolean;
  contactId: string | null;
  onSlotSelected: (date: Date, time: string) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  isEnabled,
  contactId,
  onSlotSelected,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const { toast } = useToast();

  // Mock availability data - in real app, this would come from availability_slots table
  const mockAvailability = {
    slots: [
      { time: '09:00', available: true },
      { time: '09:30', available: true },
      { time: '10:00', available: false },
      { time: '10:30', available: true },
      { time: '11:00', available: true },
      { time: '11:30', available: false },
      { time: '14:00', available: true },
      { time: '14:30', available: true },
      { time: '15:00', available: true },
      { time: '15:30', available: false },
      { time: '16:00', available: true },
      { time: '16:30', available: true },
    ],
    availableDays: [1, 2, 3, 4, 5], // Monday to Friday
  };

  // Generate available dates for the next 30 days
  useEffect(() => {
    const dates: Date[] = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      
      // Only include weekdays (Monday to Friday)
      if (mockAvailability.availableDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
        dates.push(date);
      }
    }
    
    setAvailableDates(dates);
  }, []);

  // Update available slots when date is selected
  useEffect(() => {
    if (selectedDate && isEnabled) {
      setAvailableSlots(mockAvailability.slots);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, isEnabled]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!isEnabled || !date) return;
    
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return;
    
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string, available: boolean) => {
    if (!available || !isEnabled) return;
    
    setSelectedTime(time);
  };

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedTime || !contactId) return;
    
    onSlotSelected(selectedDate, selectedTime);
    
    toast({
      title: 'Rendez-vous confirmé !',
      description: `Votre rendez-vous est prévu le ${format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })} à ${selectedTime}`,
    });
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(availableDate => isSameDay(availableDate, date));
  };

  if (!isEnabled) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="bg-muted/50 rounded-full p-6 mb-4">
          <CalendarIcon className="h-12 w-12 text-calendeo-disabled" />
        </div>
        <h3 className="text-xl font-medium text-calendeo-disabled mb-2">
          Calendrier non disponible
        </h3>
        <p className="text-muted-foreground max-w-sm">
          Veuillez remplir le formulaire avant de choisir un créneau horaire.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Choisissez votre créneau
        </h3>
        <p className="text-muted-foreground">
          Sélectionnez une date puis un horaire disponible
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => 
              isBefore(date, startOfDay(new Date())) || 
              !isDateAvailable(date)
            }
            className={cn("w-full pointer-events-auto")}
            modifiers={{
              available: availableDates,
            }}
            modifiersStyles={{
              available: {
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              },
            }}
          />
        </Card>

        {/* Time Slots */}
        <div className="space-y-4">
          {selectedDate ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Créneaux pour le {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    disabled={!slot.available}
                    onClick={() => handleTimeSelect(slot.time, slot.available)}
                    className={cn(
                      "h-12 justify-center",
                      !slot.available && "opacity-50 cursor-not-allowed",
                      selectedTime === slot.time && "bg-primary text-primary-foreground"
                    )}
                  >
                    {slot.time}
                    {!slot.available && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Occupé
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Sélectionnez une date pour voir les créneaux disponibles
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Button */}
      {selectedDate && selectedTime && (
        <div className="pt-6 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-sm text-muted-foreground">
                  à {selectedTime}
                </p>
              </div>
              <Badge className="bg-calendeo-success text-white">
                Disponible
              </Badge>
            </div>
          </div>
          
          <Button 
            onClick={handleConfirmBooking}
            className="w-full h-12 bg-calendeo-success hover:bg-calendeo-success/90 text-white font-medium rounded-lg"
          >
            Confirmer le rendez-vous
          </Button>
        </div>
      )}
    </div>
  );
};