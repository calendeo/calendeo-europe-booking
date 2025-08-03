import React, { useState } from 'react';
import { LeadForm } from '@/components/booking/LeadForm';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFormComplete = (isValid: boolean) => {
    setIsFormComplete(isValid);
  };

  const handleContactCreated = (newContactId: string) => {
    setContactId(newContactId);
  };

  const handleSlotSelected = async (date: Date, time: string) => {
    if (!contactId) {
      toast({
        title: 'Erreur',
        description: 'Aucun contact trouvé. Veuillez recharger la page.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create event using edge function (in real app)
      const eventData = {
        guest_id: contactId,
        date_time: new Date(`${date.toISOString().split('T')[0]}T${time}:00`),
        duration: 30,
        type: 'consultation',
        host_ids: ['00000000-0000-0000-0000-000000000000'], // Mock host ID
        name: 'Consultation',
        location: 'online',
      };

      console.log('Creating event:', eventData);
      
      // For demo purposes, we'll just show success
      // In production, this would call the event-creation-flow edge function
      
      toast({
        title: 'Rendez-vous créé !',
        description: 'Vous recevrez un email de confirmation sous peu.',
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création du rendez-vous.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Calendeo</h1>
            <div className="text-sm text-muted-foreground">
              Prise de rendez-vous en ligne
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
            {/* Left Panel - Lead Form */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <LeadForm 
                onFormComplete={handleFormComplete}
                onContactCreated={handleContactCreated}
              />
            </div>

            {/* Right Panel - Calendar */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <BookingCalendar 
                isEnabled={isFormComplete}
                contactId={contactId}
                onSlotSelected={handleSlotSelected}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            Propulsé par Calendeo - Solution de prise de rendez-vous en ligne
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
