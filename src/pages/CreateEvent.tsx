import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EventDraft {
  name?: string;
  duration?: number;
  type?: string;
  location?: string;
  // Will be extended with more fields as we build each step
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
  const [eventDraft, setEventDraft] = useState<EventDraft>({});

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
            
            <div className="bg-card rounded-xl p-6 border">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nom de l'événement *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Consultation découverte"
                    value={eventDraft.name || ''}
                    onChange={(e) => setEventDraft(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Durée *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={eventDraft.duration || 30}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 heure</option>
                      <option value={90}>1h30</option>
                      <option value={120}>2 heures</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Type *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={eventDraft.type || 'consultation'}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="consultation">Consultation</option>
                      <option value="meeting">Réunion</option>
                      <option value="demo">Démonstration</option>
                      <option value="interview">Entretien</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Lieu *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={eventDraft.location || 'online'}
                      onChange={(e) => setEventDraft(prev => ({ ...prev, location: e.target.value }))}
                    >
                      <option value="online">En ligne</option>
                      <option value="phone">Téléphone</option>
                      <option value="in_person">En personne</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-6">
                <Button 
                  onClick={() => handleSaveStep({ name: eventDraft.name, duration: eventDraft.duration, type: eventDraft.type, location: eventDraft.location })}
                  disabled={!eventDraft.name}
                  className="px-6"
                >
                  Continuer
                </Button>
              </div>
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