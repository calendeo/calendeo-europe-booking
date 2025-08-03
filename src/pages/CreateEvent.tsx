import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Users, MapPin, Globe, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface EventDraft {
  name?: string;
  color?: string;
  mode?: 'private' | 'group' | 'round_robin';
  host_ids?: string[];
  guest_limit?: number;
  show_remaining_spots?: boolean;
  rotation_ids?: string[];
  priorities?: { [userId: string]: number };
  location?: 'zoom' | 'google_meet' | 'phone' | 'in_person';
  address?: string;
  description?: string;
  slug?: string;
  internal_note?: string;
  duration?: number;
  type?: string;
}

interface Step {
  id: number;
  name: string;
  title: string;
  completed: boolean;
  active: boolean;
  locked: boolean;
  comingSoon?: boolean;
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    color: '#1a6be3',
    mode: 'private'
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Color palette for event colors
  const colorOptions = [
    '#1a6be3', '#57d084', '#f27c7c', '#ffa726', 
    '#9c27b0', '#2196f3', '#4caf50', '#ff5722'
  ];

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Fetch available users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('calendar_connected', true)
        .eq('active', true);
      setAvailableUsers(data || []);
    };
    fetchUsers();
  }, []);

  // Auto-generate slug when name changes
  useEffect(() => {
    if (eventDraft.name && (!eventDraft.slug || eventDraft.slug === generateSlug(eventDraft.name))) {
      setEventDraft(prev => ({ ...prev, slug: generateSlug(eventDraft.name || '') }));
    }
  }, [eventDraft.name]);

  const [steps, setSteps] = useState<Step[]>([
    { id: 1, name: 'Détails', title: 'Informations de base', completed: false, active: true, locked: false },
    { id: 2, name: 'Horaires', title: 'Disponibilités', completed: false, active: false, locked: true },
    { id: 3, name: 'Formulaire', title: 'Questions pour les invités', completed: false, active: false, locked: true },
    { id: 4, name: 'Disqualifications', title: 'Règles de qualification', completed: false, active: false, locked: true, comingSoon: true },
    { id: 5, name: 'Automatisations', title: 'Actions automatiques', completed: false, active: false, locked: true, comingSoon: true },
    { id: 6, name: 'Notifications', title: 'Emails et rappels', completed: false, active: false, locked: true },
    { id: 7, name: 'Confirmation', title: 'Révision et publication', completed: false, active: false, locked: true },
  ]);

  const handleStepClick = (stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    if (step && !step.locked && !step.comingSoon) {
      setCurrentStep(stepId);
      setSteps(prev => prev.map(s => ({
        ...s,
        active: s.id === stepId
      })));
    }
  };

  const handleSaveStep = (stepData: Partial<EventDraft>) => {
    setEventDraft(prev => ({ ...prev, ...stepData }));
    
    // Mark current step as completed and unlock next step
    setSteps(prev => prev.map(s => {
      if (s.id === currentStep) {
        return { ...s, completed: true };
      }
      if (s.id === currentStep + 1 && !s.comingSoon) {
        return { ...s, locked: false };
      }
      return s;
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        const isStep1Valid = eventDraft.name && eventDraft.host_ids && eventDraft.host_ids.length > 0;
        
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Détails de l'événement
              </h2>
              <p className="text-muted-foreground">
                Configurez les informations de base de votre événement.
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 border space-y-8">
              {/* Event Name */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nom de l'événement *
                </Label>
                <Input
                  id="name"
                  placeholder="Ex : Appel découverte, Entretien stratégique"
                  value={eventDraft.name || ''}
                  onChange={(e) => setEventDraft(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2"
                />
              </div>

              {/* Event Color */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Couleur de l'événement *
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEventDraft(prev => ({ ...prev, color }))}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        eventDraft.color === color ? "border-foreground scale-110" : "border-border"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Event Mode */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Type d'événement *
                </Label>
                <RadioGroup 
                  value={eventDraft.mode} 
                  onValueChange={(value: 'private' | 'group' | 'round_robin') => 
                    setEventDraft(prev => ({ ...prev, mode: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private">Privé - 1 organisateur → 1 invité</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="group" />
                    <Label htmlFor="group">Groupe - 1 organisateur → plusieurs invités</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="round_robin" id="round_robin" />
                    <Label htmlFor="round_robin">Répartition - Organisateurs tournants (Round Robin)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Organizers */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Organisateurs *
                </Label>
                {availableUsers.length === 0 ? (
                  <div className="p-4 bg-accent/50 rounded-lg border border-accent">
                    <p className="text-sm text-muted-foreground">
                      Pour continuer la création de votre événement, vous devez connecter un calendrier et enregistrer vos disponibilités.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <div 
                        key={user.id}
                        className={cn(
                          "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all",
                          eventDraft.host_ids?.includes(user.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                        onClick={() => {
                          const currentHosts = eventDraft.host_ids || [];
                          const isSelected = currentHosts.includes(user.id);
                          if (eventDraft.mode === 'private' || eventDraft.mode === 'group') {
                            setEventDraft(prev => ({ ...prev, host_ids: isSelected ? [] : [user.id] }));
                          } else {
                            setEventDraft(prev => ({ 
                              ...prev, 
                              host_ids: isSelected 
                                ? currentHosts.filter(id => id !== user.id)
                                : [...currentHosts, user.id]
                            }));
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                          <span className="text-sm text-muted-foreground">({user.email})</span>
                        </div>
                        {eventDraft.host_ids?.includes(user.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Guest Limit for Group Mode */}
              {eventDraft.mode === 'group' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="guest_limit" className="text-sm font-medium text-foreground">
                      Nombre maximum d'invités
                    </Label>
                    <Input
                      id="guest_limit"
                      type="number"
                      min="1"
                      max="100"
                      value={eventDraft.guest_limit || ''}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, guest_limit: parseInt(e.target.value) || undefined }))}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show_remaining"
                      checked={eventDraft.show_remaining_spots || false}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, show_remaining_spots: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="show_remaining" className="text-sm">
                      Afficher les places restantes sur la page de réservation
                    </Label>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Lieu de l'événement *
                </Label>
                <RadioGroup 
                  value={eventDraft.location || 'zoom'} 
                  onValueChange={(value: 'zoom' | 'google_meet' | 'phone' | 'in_person') => 
                    setEventDraft(prev => ({ ...prev, location: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="zoom" id="zoom" />
                    <Label htmlFor="zoom" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Zoom
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="google_meet" id="google_meet" />
                    <Label htmlFor="google_meet" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Google Meet
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phone" />
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_person" id="in_person" />
                    <Label htmlFor="in_person" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      En présentiel
                    </Label>
                  </div>
                </RadioGroup>
                
                {eventDraft.location === 'in_person' && (
                  <Input
                    placeholder="Adresse complète"
                    value={eventDraft.address || ''}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, address: e.target.value }))}
                    className="mt-3"
                  />
                )}
              </div>

              {/* Public Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description publique (facultatif)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Indiquez des informations utiles à vos invités"
                  value={eventDraft.description || ''}
                  onChange={(e) => setEventDraft(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Custom Slug */}
              <div>
                <Label htmlFor="slug" className="text-sm font-medium text-foreground">
                  Lien personnalisé *
                </Label>
                <div className="mt-2 flex items-center">
                  <span className="text-sm text-muted-foreground">calendeo.com/</span>
                  <Input
                    id="slug"
                    value={eventDraft.slug || ''}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, slug: e.target.value }))}
                    className="ml-1 flex-1"
                  />
                </div>
              </div>

              {/* Internal Note */}
              <div>
                <Label htmlFor="internal_note" className="text-sm font-medium text-foreground">
                  Note interne (facultatif)
                </Label>
                <Textarea
                  id="internal_note"
                  placeholder="Notes privées non visibles par les invités"
                  value={eventDraft.internal_note || ''}
                  onChange={(e) => setEventDraft(prev => ({ ...prev, internal_note: e.target.value }))}
                  className="mt-2"
                  rows={2}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  if (isStep1Valid) {
                    handleSaveStep(eventDraft);
                    setCurrentStep(2);
                    setSteps(prev => prev.map(s => ({
                      ...s,
                      active: s.id === 2,
                      completed: s.id === 1 ? true : s.completed,
                      locked: s.id === 2 ? false : s.locked
                    })));
                  }
                }}
                disabled={!isStep1Valid}
                className="px-8"
              >
                Enregistrer et continuer
              </Button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="text-lg font-medium text-foreground">
                {steps.find(s => s.id === currentStep)?.title}
              </div>
              <p className="text-muted-foreground">
                Cette étape sera construite dans un prochain prompt.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">
                Création d'un nouvel événement
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Navigation par étapes */}
        <aside className="w-80 bg-card border-r min-h-[calc(100vh-73px)]">
          <div className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
              Progression
            </h3>
            
            <nav className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                    step.active && "bg-primary/10 border border-primary/20",
                    step.completed && !step.active && "bg-success/5 border border-success/20",
                    step.locked && "opacity-50 cursor-not-allowed",
                    step.comingSoon && "opacity-40 cursor-not-allowed",
                    !step.active && !step.completed && !step.locked && !step.comingSoon && "hover:bg-muted/50"
                  )}
                  onClick={() => handleStepClick(step.id)}
                >
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                    step.active && "bg-primary text-primary-foreground",
                    step.completed && !step.active && "bg-success text-success-foreground",
                    !step.active && !step.completed && "bg-muted text-muted-foreground"
                  )}>
                    {step.completed ? <Check className="h-3 w-3" /> : step.id}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-sm font-medium",
                      step.active && "text-primary",
                      step.completed && !step.active && "text-success",
                      !step.active && !step.completed && "text-foreground"
                    )}>
                      {step.name}
                      {step.comingSoon && (
                        <span className="ml-2 text-xs text-muted-foreground">(bientôt)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {step.title}
                    </div>
                  </div>
                </div>
              ))}
            </nav>
            
            {/* Coming soon message for disabled steps */}
            <div className="mt-6 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Les étapes "Disqualifications" et "Automatisations" sont à venir dans les prochaines mises à jour.
              </p>
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 p-8">
          {renderStepContent()}
        </main>
      </div>
    </div>
  );
};

export default CreateEvent;