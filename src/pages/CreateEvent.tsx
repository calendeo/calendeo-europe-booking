import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Users, MapPin, Globe, Phone, Video, Clock, Plus, Edit2, Trash2, GripVertical, FileText, AlignLeft, CheckSquare, Circle, ChevronDown, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GuestFormQuestion {
  id: string;
  type: 'short_text' | 'long_text' | 'checkbox' | 'radio' | 'dropdown' | 'url';
  label: string;
  required: boolean;
  options?: string[];
}

interface DisqualificationRule {
  id: string;
  question_id?: string;
  question_type: 'radio' | 'checkbox' | 'phone';
  operator: 'is' | 'is_not';
  expected_value: string;
}

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
  // Step 2 fields
  booking_window_type?: 'custom' | 'unlimited';
  booking_window_start?: string;
  booking_window_end?: string;
  slot_interval?: number;
  timezone_behavior?: 'auto' | 'locked';
  timezone_fixed?: string;
  time_format?: '12h' | '24h';
  buffers_enabled?: boolean;
  buffer_before?: number;
  buffer_after?: number;
  reschedule_allowed_guest?: boolean;
  reschedule_allowed_team?: boolean;
  language?: 'fr' | 'en';
  hide_cookie_banner?: boolean;
  // Step 3 fields
  guest_form?: {
    include_last_name: boolean;
    include_email: boolean;
    custom_questions: GuestFormQuestion[];
  };
  // Step 4 fields
  disqualifications?: {
    rules: DisqualificationRule[];
    logic_type: 'AND' | 'OR';
    message: string;
    redirect_enabled: boolean;
    redirect_url?: string;
    redirect_with_params: boolean;
  };
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
    mode: 'private',
    guest_form: {
      include_last_name: false,
      include_email: false,
      custom_questions: []
    },
    disqualifications: {
      rules: [],
      logic_type: 'OR',
      message: 'Désolé, vous ne pouvez pas réserver cet évènement pour le moment.',
      redirect_enabled: false,
      redirect_with_params: false
    }
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<GuestFormQuestion | null>(null);
  const [newRule, setNewRule] = useState<Partial<DisqualificationRule>>({
    operator: 'is',
    question_type: 'phone'
  });

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
    { id: 4, name: 'Disqualifications', title: 'Règles de qualification', completed: false, active: false, locked: true },
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
        const isStep1Valid = eventDraft.name; // Temporarily removed calendar connection requirement
        
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
      
      case 2:
        const isStep2Valid = eventDraft.duration && eventDraft.slot_interval;
        
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Disponibilités et paramètres
              </h2>
              <p className="text-muted-foreground">
                Configurez la durée, les créneaux et les paramètres de réservation.
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 border space-y-8">
              {/* Event Duration */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Durée de l'événement *
                </Label>
                <Select 
                  value={eventDraft.duration?.toString()} 
                  onValueChange={(value) => setEventDraft(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Booking Window */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Fenêtre de réservation
                </Label>
                <p className="text-sm text-muted-foreground mb-4">
                  À quelle distance peut-on réserver cet événement ?
                </p>
                <RadioGroup 
                  value={eventDraft.booking_window_type || 'custom'} 
                  onValueChange={(value: 'custom' | 'unlimited') => 
                    setEventDraft(prev => ({ ...prev, booking_window_type: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom_window" />
                    <Label htmlFor="custom_window">Choisir une fenêtre personnalisée</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unlimited" id="unlimited_window" />
                    <Label htmlFor="unlimited_window">Aucune limite (réservation à tout moment)</Label>
                  </div>
                </RadioGroup>

                {eventDraft.booking_window_type === 'custom' && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="booking_start" className="text-sm text-muted-foreground">
                        Date de début
                      </Label>
                      <Input
                        id="booking_start"
                        type="date"
                        value={eventDraft.booking_window_start || ''}
                        onChange={(e) => setEventDraft(prev => ({ ...prev, booking_window_start: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="booking_end" className="text-sm text-muted-foreground">
                        Date de fin
                      </Label>
                      <Input
                        id="booking_end"
                        type="date"
                        value={eventDraft.booking_window_end || ''}
                        onChange={(e) => setEventDraft(prev => ({ ...prev, booking_window_end: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Slot Frequency */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Intervalle entre les créneaux *
                </Label>
                <Select 
                  value={eventDraft.slot_interval?.toString()} 
                  onValueChange={(value) => setEventDraft(prev => ({ ...prev, slot_interval: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'intervalle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Zone Behavior */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Comportement du fuseau horaire
                </Label>
                <RadioGroup 
                  value={eventDraft.timezone_behavior || 'auto'} 
                  onValueChange={(value: 'auto' | 'locked') => 
                    setEventDraft(prev => ({ ...prev, timezone_behavior: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto_timezone" />
                    <Label htmlFor="auto_timezone">Détecter automatiquement le fuseau de l'invité</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="locked" id="locked_timezone" />
                    <Label htmlFor="locked_timezone">Verrouiller le fuseau horaire (recommandé pour les événements en présentiel)</Label>
                  </div>
                </RadioGroup>

                {eventDraft.timezone_behavior === 'locked' && (
                  <div className="mt-4">
                    <Select 
                      value={eventDraft.timezone_fixed} 
                      onValueChange={(value) => setEventDraft(prev => ({ ...prev, timezone_fixed: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fuseau horaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Time Format */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Format d'heure
                </Label>
                <RadioGroup 
                  value={eventDraft.time_format || '24h'} 
                  onValueChange={(value: '12h' | '24h') => 
                    setEventDraft(prev => ({ ...prev, time_format: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="12h" id="format_12h" />
                    <Label htmlFor="format_12h">12h (AM/PM)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="24h" id="format_24h" />
                    <Label htmlFor="format_24h">24h</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Buffers */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      Temps tampon
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ajouter du temps avant et après l'événement
                    </p>
                  </div>
                  <Switch
                    checked={eventDraft.buffers_enabled || false}
                    onCheckedChange={(checked) => setEventDraft(prev => ({ ...prev, buffers_enabled: checked }))}
                  />
                </div>

                {eventDraft.buffers_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        Avant l'événement
                      </Label>
                      <Select 
                        value={eventDraft.buffer_before?.toString()} 
                        onValueChange={(value) => setEventDraft(prev => ({ ...prev, buffer_before: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground mb-2 block">
                        Après l'événement
                      </Label>
                      <Select 
                        value={eventDraft.buffer_after?.toString()} 
                        onValueChange={(value) => setEventDraft(prev => ({ ...prev, buffer_after: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Rescheduling Rules */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Règles de reprogrammation
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reschedule_guest"
                      checked={eventDraft.reschedule_allowed_guest || false}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, reschedule_allowed_guest: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="reschedule_guest" className="text-sm">
                      Permettre aux invités de reprogrammer cet événement
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="reschedule_team"
                      checked={eventDraft.reschedule_allowed_team || false}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, reschedule_allowed_team: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="reschedule_team" className="text-sm">
                      Permettre aux membres de l'équipe de reprogrammer cet événement
                    </Label>
                  </div>
                </div>
              </div>

              {/* Event Language */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-3 block">
                  Langue de l'événement
                </Label>
                <Select 
                  value={eventDraft.language || 'fr'} 
                  onValueChange={(value: 'fr' | 'en') => setEventDraft(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cookie Banner */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      Masquer la bannière de cookies Calendeo
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Utilisez cette option si votre site gère déjà le consentement aux cookies
                    </p>
                  </div>
                  <Switch
                    checked={eventDraft.hide_cookie_banner || false}
                    onCheckedChange={(checked) => setEventDraft(prev => ({ ...prev, hide_cookie_banner: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  setCurrentStep(1);
                  setSteps(prev => prev.map(s => ({
                    ...s,
                    active: s.id === 1
                  })));
                }}
                className="px-8"
              >
                ← Retour
              </Button>
              <Button 
                onClick={() => {
                  if (isStep2Valid) {
                    handleSaveStep(eventDraft);
                    setCurrentStep(3);
                    setSteps(prev => prev.map(s => ({
                      ...s,
                      active: s.id === 3,
                      completed: s.id === 2 ? true : s.completed,
                      locked: s.id === 3 ? false : s.locked
                    })));
                  }
                }}
                disabled={!isStep2Valid}
                className="px-8"
              >
                Enregistrer et continuer →
              </Button>
            </div>
          </div>
        );

      case 3:
        const isStep3Valid = true; // Always valid as form is optional
        
        // Initialize guest form if not exists
        if (!eventDraft.guest_form) {
          setEventDraft(prev => ({
            ...prev,
            guest_form: {
              include_last_name: false,
              include_email: false,
              custom_questions: []
            }
          }));
        }

        const QuestionModal = () => {
          const [questionData, setQuestionData] = useState<Partial<GuestFormQuestion>>(
            editingQuestion || {
              type: 'short_text',
              label: '',
              required: false,
              options: []
            }
          );

          const questionTypeIcons = {
            short_text: FileText,
            long_text: AlignLeft,
            checkbox: CheckSquare,
            radio: Circle,
            dropdown: ChevronDown,
            url: Link
          };

          const requiresOptions = (type: string) => 
            ['checkbox', 'radio', 'dropdown'].includes(type);

          const handleSaveQuestion = () => {
            if (!questionData.label) return;

            const newQuestion: GuestFormQuestion = {
              id: editingQuestion?.id || `q_${Date.now()}`,
              type: questionData.type!,
              label: questionData.label,
              required: questionData.required || false,
              options: requiresOptions(questionData.type!) ? (questionData.options || []) : undefined
            };

            setEventDraft(prev => ({
              ...prev,
              guest_form: {
                ...prev.guest_form!,
                custom_questions: editingQuestion
                  ? prev.guest_form!.custom_questions.map(q => q.id === editingQuestion.id ? newQuestion : q)
                  : [...prev.guest_form!.custom_questions, newQuestion]
              }
            }));

            setIsQuestionModalOpen(false);
            setEditingQuestion(null);
          };

          return (
            <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? 'Modifier la question' : 'Ajouter une nouvelle question'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Question Type */}
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-3 block">
                      Type de question *
                    </Label>
                    <Select 
                      value={questionData.type} 
                      onValueChange={(value: GuestFormQuestion['type']) => 
                        setQuestionData(prev => ({ ...prev, type: value, options: requiresOptions(value) ? ['Option 1'] : undefined }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short_text">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Texte court
                          </div>
                        </SelectItem>
                        <SelectItem value="long_text">
                          <div className="flex items-center gap-2">
                            <AlignLeft className="h-4 w-4" />
                            Texte long
                          </div>
                        </SelectItem>
                        <SelectItem value="checkbox">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" />
                            Cases à cocher
                          </div>
                        </SelectItem>
                        <SelectItem value="radio">
                          <div className="flex items-center gap-2">
                            <Circle className="h-4 w-4" />
                            Boutons radio
                          </div>
                        </SelectItem>
                        <SelectItem value="dropdown">
                          <div className="flex items-center gap-2">
                            <ChevronDown className="h-4 w-4" />
                            Menu déroulant
                          </div>
                        </SelectItem>
                        <SelectItem value="url">
                          <div className="flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            URL
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Question Label */}
                  <div>
                    <Label htmlFor="question_label" className="text-sm font-medium text-foreground">
                      Libellé de la question *
                    </Label>
                    <Input
                      id="question_label"
                      placeholder="Ex: Quel est votre secteur d'activité ?"
                      value={questionData.label || ''}
                      onChange={(e) => setQuestionData(prev => ({ ...prev, label: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  {/* Required Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">
                      Question obligatoire
                    </Label>
                    <Switch
                      checked={questionData.required || false}
                      onCheckedChange={(checked) => setQuestionData(prev => ({ ...prev, required: checked }))}
                    />
                  </div>

                  {/* Options for choice-based questions */}
                  {requiresOptions(questionData.type!) && (
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-3 block">
                        Options de réponse
                      </Label>
                      <div className="space-y-2">
                        {(questionData.options || []).map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(questionData.options || [])];
                                newOptions[index] = e.target.value;
                                setQuestionData(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Option ${index + 1}`}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newOptions = questionData.options?.filter((_, i) => i !== index) || [];
                                setQuestionData(prev => ({ ...prev, options: newOptions }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          onClick={() => {
                            const newOptions = [...(questionData.options || []), `Option ${(questionData.options?.length || 0) + 1}`];
                            setQuestionData(prev => ({ ...prev, options: newOptions }));
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une option
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsQuestionModalOpen(false);
                        setEditingQuestion(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button onClick={handleSaveQuestion} disabled={!questionData.label}>
                      {editingQuestion ? 'Modifier' : 'Ajouter'} la question
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        };

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Formulaire des invités
              </h2>
              <p className="text-muted-foreground">
                Configurez les informations que vous souhaitez collecter auprès de vos invités.
              </p>
            </div>
            
            <div className="bg-card rounded-xl p-6 border space-y-8">
              {/* Primary Questions */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Questions principales
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ces champs apparaissent toujours sur le formulaire de réservation.
                </p>
                
                <div className="space-y-4">
                  {/* Always required fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div>
                        <div className="font-medium text-sm">Prénom</div>
                        <div className="text-xs text-muted-foreground">Toujours requis</div>
                      </div>
                      <span className="text-xs text-primary font-medium">OBLIGATOIRE</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div>
                        <div className="font-medium text-sm">Numéro de téléphone</div>
                        <div className="text-xs text-muted-foreground">Recommandé obligatoire</div>
                      </div>
                      <span className="text-xs text-primary font-medium">OBLIGATOIRE</span>
                    </div>
                  </div>
                  
                  {/* Optional toggleable fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Nom de famille</div>
                        <div className="text-xs text-muted-foreground">Optionnel</div>
                      </div>
                      <Switch
                        checked={eventDraft.guest_form?.include_last_name || false}
                        onCheckedChange={(checked) => 
                          setEventDraft(prev => ({
                            ...prev,
                            guest_form: {
                              ...prev.guest_form!,
                              include_last_name: checked
                            }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Adresse email</div>
                        <div className="text-xs text-muted-foreground">Optionnel</div>
                      </div>
                      <Switch
                        checked={eventDraft.guest_form?.include_email || false}
                        onCheckedChange={(checked) => 
                          setEventDraft(prev => ({
                            ...prev,
                            guest_form: {
                              ...prev.guest_form!,
                              include_email: checked
                            }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Questions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      Questions personnalisées
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez des questions pour mieux qualifier vos invités.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingQuestion(null);
                      setIsQuestionModalOpen(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une question
                  </Button>
                </div>

                {/* Questions List */}
                {eventDraft.guest_form?.custom_questions && eventDraft.guest_form.custom_questions.length > 0 ? (
                  <div className="space-y-3">
                    {eventDraft.guest_form.custom_questions.map((question) => {
                      const IconComponent = {
                        short_text: FileText,
                        long_text: AlignLeft,
                        checkbox: CheckSquare,
                        radio: Circle,
                        dropdown: ChevronDown,
                        url: Link
                      }[question.type];

                      return (
                        <div key={question.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <GripVertical className="h-4 w-4" />
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{question.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {question.type.replace('_', ' ')} 
                                {question.required && (
                                  <span className="ml-2 text-primary font-medium">(Obligatoire)</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEditingQuestion(question);
                                setIsQuestionModalOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setEventDraft(prev => ({
                                  ...prev,
                                  guest_form: {
                                    ...prev.guest_form!,
                                    custom_questions: prev.guest_form!.custom_questions.filter(q => q.id !== question.id)
                                  }
                                }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-2">Aucune question personnalisée</div>
                    <div className="text-sm">Cliquez sur "Ajouter une question" pour commencer</div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  setCurrentStep(2);
                  setSteps(prev => prev.map(s => ({
                    ...s,
                    active: s.id === 2
                  })));
                }}
                className="px-8"
              >
                ← Retour
              </Button>
              <Button 
                onClick={() => {
                  handleSaveStep(eventDraft);
                  setCurrentStep(4);
                  setSteps(prev => prev.map(s => ({
                    ...s,
                    active: s.id === 4,
                    completed: s.id === 3 ? true : s.completed,
                    locked: s.id === 4 ? false : s.locked
                  })));
                }}
                className="px-8"
              >
                Enregistrer et continuer →
              </Button>
            </div>

            <QuestionModal />
          </div>
        );

      case 4:
        // Check if we have eligible fields for disqualification
        const hasPhoneField = true; // Phone is always included
        const hasChoiceQuestions = eventDraft.guest_form?.custom_questions?.some(q => 
          q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown'
        ) || false;
        const hasEligibleFields = hasPhoneField || hasChoiceQuestions;

        // Get all eligible questions for disqualification rules
        const eligibleQuestions = [
          ...(hasPhoneField ? [{ id: 'phone', label: 'Numéro de téléphone', type: 'phone' as const }] : []),
          ...(eventDraft.guest_form?.custom_questions?.filter(q => 
            q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown'
          ) || [])
        ];


        const [newRule, setNewRule] = useState<Partial<DisqualificationRule>>({
          operator: 'is',
          question_type: 'phone'
        });

        const addDisqualificationRule = () => {
          if (!newRule.question_id || !newRule.expected_value) return;

          const rule: DisqualificationRule = {
            id: crypto.randomUUID(),
            question_id: newRule.question_id,
            question_type: newRule.question_type!,
            operator: newRule.operator!,
            expected_value: newRule.expected_value
          };

          setEventDraft(prev => ({
            ...prev,
            disqualifications: {
              ...prev.disqualifications!,
              rules: [...prev.disqualifications!.rules, rule]
            }
          }));

          setNewRule({ operator: 'is', question_type: 'phone' });
        };

        const removeRule = (ruleId: string) => {
          setEventDraft(prev => ({
            ...prev,
            disqualifications: {
              ...prev.disqualifications!,
              rules: prev.disqualifications!.rules.filter(r => r.id !== ruleId)
            }
          }));
        };

        const isStep4Valid = eventDraft.disqualifications?.rules.length! > 0;

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Disqualification automatique
              </h2>
              <p className="text-muted-foreground">
                Définissez des règles pour exclure automatiquement certaines personnes avant qu'elles n'accèdent à votre page de réservation.
              </p>
            </div>

            {!hasEligibleFields ? (
              // No eligible fields warning
              <div className="bg-card rounded-xl p-8 border text-center space-y-4">
                <div className="text-lg font-medium text-foreground">
                  Aucun champ éligible pour la disqualification
                </div>
                <p className="text-muted-foreground">
                  La disqualification nécessite au moins une question à choix ou un numéro de téléphone. 
                  Modifiez vos questions pour activer cette fonctionnalité.
                </p>
                <Button 
                  onClick={() => {
                    setCurrentStep(3);
                    setSteps(prev => prev.map(s => ({
                      ...s,
                      active: s.id === 3
                    })));
                  }}
                >
                  Modifier les questions
                </Button>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-6 border space-y-8">
                {/* Disqualification Rules */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    Règles de disqualification
                  </h3>
                  
                  {/* Add Rule Section */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">
                          Question concernée
                        </Label>
                        <Select
                          value={newRule.question_id}
                          onValueChange={(value) => {
                            const question = eligibleQuestions.find(q => q.id === value);
                            setNewRule(prev => ({
                              ...prev,
                              question_id: value,
                              question_type: question?.type === 'phone' ? 'phone' : 
                                           question?.type === 'radio' ? 'radio' :
                                           question?.type === 'checkbox' ? 'checkbox' : 'radio'
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une question" />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleQuestions.map((question) => (
                              <SelectItem key={question.id} value={question.id}>
                                {question.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">
                          Condition
                        </Label>
                        <Select
                          value={newRule.operator}
                          onValueChange={(value: 'is' | 'is_not') => setNewRule(prev => ({ ...prev, operator: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="is">EST</SelectItem>
                            <SelectItem value="is_not">N'EST PAS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">
                          Valeur attendue
                        </Label>
                        {newRule.question_type === 'phone' ? (
                          <Select
                            value={newRule.expected_value}
                            onValueChange={(value) => setNewRule(prev => ({ ...prev, expected_value: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Code pays" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+33">+33 (France)</SelectItem>
                              <SelectItem value="+1">+1 (USA/Canada)</SelectItem>
                              <SelectItem value="+44">+44 (UK)</SelectItem>
                              <SelectItem value="+49">+49 (Allemagne)</SelectItem>
                              <SelectItem value="+39">+39 (Italie)</SelectItem>
                              <SelectItem value="+34">+34 (Espagne)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={newRule.expected_value}
                            onValueChange={(value) => setNewRule(prev => ({ ...prev, expected_value: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une réponse" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const question = eligibleQuestions.find(q => q.id === newRule.question_id);
                                if (question && 'options' in question && question.options) {
                                  return question.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ));
                                }
                                return [];
                              })()}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={addDisqualificationRule}
                      disabled={!newRule.question_id || !newRule.expected_value}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter cette règle
                    </Button>
                  </div>

                  {/* Existing Rules */}
                  {eventDraft.disqualifications?.rules && eventDraft.disqualifications.rules.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">Règles actives</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Logique:</span>
                          <Switch
                            checked={eventDraft.disqualifications.logic_type === 'AND'}
                            onCheckedChange={(checked) =>
                              setEventDraft(prev => ({
                                ...prev,
                                disqualifications: {
                                  ...prev.disqualifications!,
                                  logic_type: checked ? 'AND' : 'OR'
                                }
                              }))
                            }
                          />
                          <span className="text-sm font-medium">
                            {eventDraft.disqualifications.logic_type}
                          </span>
                        </div>
                      </div>
                      
                      {eventDraft.disqualifications.rules.map((rule) => {
                        const question = eligibleQuestions.find(q => q.id === rule.question_id);
                        return (
                          <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="text-sm">
                              <span className="font-medium">{question?.label}</span>
                              <span className="mx-2 text-muted-foreground">
                                {rule.operator === 'is' ? 'EST' : "N'EST PAS"}
                              </span>
                              <span className="font-medium">{rule.expected_value}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => removeRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      
                      {/* Preview */}
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          <strong>Aperçu:</strong> Si {eventDraft.disqualifications.rules.map((rule, index) => {
                            const question = eligibleQuestions.find(q => q.id === rule.question_id);
                            return (
                              <span key={rule.id}>
                                {index > 0 && ` ${eventDraft.disqualifications!.logic_type} `}
                                la réponse à "{question?.label}" {rule.operator === 'is' ? 'EST' : "N'EST PAS"} {rule.expected_value}
                              </span>
                            );
                          })}, alors l'invité sera disqualifié.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Disqualification Message */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    Message affiché à l'invité
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Ce message s'affichera lorsqu'un invité est disqualifié
                  </p>
                  <Textarea
                    value={eventDraft.disqualifications?.message || ''}
                    onChange={(e) => 
                      setEventDraft(prev => ({
                        ...prev,
                        disqualifications: {
                          ...prev.disqualifications!,
                          message: e.target.value
                        }
                      }))
                    }
                    placeholder="Désolé, vous ne pouvez pas réserver cet évènement pour le moment."
                    maxLength={250}
                    className="resize-none"
                    rows={3}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {eventDraft.disqualifications?.message?.length || 0}/250 caractères
                  </div>
                </div>

                {/* Redirect Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">
                        Redirection (optionnelle)
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Rediriger l'utilisateur vers une page externe après disqualification
                      </p>
                    </div>
                    <Switch
                      checked={eventDraft.disqualifications?.redirect_enabled || false}
                      onCheckedChange={(checked) =>
                        setEventDraft(prev => ({
                          ...prev,
                          disqualifications: {
                            ...prev.disqualifications!,
                            redirect_enabled: checked
                          }
                        }))
                      }
                    />
                  </div>
                  
                  {eventDraft.disqualifications?.redirect_enabled && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="redirect_url" className="text-sm font-medium text-foreground">
                          URL de redirection
                        </Label>
                        <Input
                          id="redirect_url"
                          type="url"
                          placeholder="https://example.com/alternative"
                          value={eventDraft.disqualifications?.redirect_url || ''}
                          onChange={(e) =>
                            setEventDraft(prev => ({
                              ...prev,
                              disqualifications: {
                                ...prev.disqualifications!,
                                redirect_url: e.target.value
                              }
                            }))
                          }
                          className="mt-2"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="redirect_with_params"
                          checked={eventDraft.disqualifications?.redirect_with_params || false}
                          onCheckedChange={(checked) =>
                            setEventDraft(prev => ({
                              ...prev,
                              disqualifications: {
                                ...prev.disqualifications!,
                                redirect_with_params: checked as boolean
                              }
                            }))
                          }
                        />
                        <Label htmlFor="redirect_with_params" className="text-sm">
                          Transmettre les données de l'événement dans l'URL
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline"
                onClick={() => {
                  setCurrentStep(3);
                  setSteps(prev => prev.map(s => ({
                    ...s,
                    active: s.id === 3
                  })));
                }}
                className="px-8"
              >
                ← Retour
              </Button>
              <Button 
                onClick={() => {
                  if (hasEligibleFields && isStep4Valid) {
                    handleSaveStep(eventDraft);
                    setCurrentStep(5);
                    setSteps(prev => prev.map(s => ({
                      ...s,
                      active: s.id === 5,
                      completed: s.id === 4 ? true : s.completed,
                      locked: s.id === 5 ? false : s.locked
                    })));
                  }
                }}
                disabled={!hasEligibleFields || !isStep4Valid}
                className="px-8"
              >
                Enregistrer et continuer →
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