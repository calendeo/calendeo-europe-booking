import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, Eye, Edit, Trash2, Move, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Form {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  disqualif_logic: any;
  event?: {
    name: string;
  }[];
  form_questions?: {
    count: number;
  }[];
  questions_count?: number;
}

interface Event {
  id: string;
  name: string;
}

interface FormQuestion {
  id: string;
  form_id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'dropdown' | 'checkbox'; // This matches the database schema
  required: boolean;
  question_order: number;
  options: string[] | null;
  condition_logic: any;
}

const Forms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', // Changed from title to name
    event_id: '',
    status: 'draft' as 'draft' | 'active'
  });
  const [questions, setQuestions] = useState<Omit<FormQuestion, 'id' | 'form_id'>[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Omit<FormQuestion, 'id' | 'form_id'>>>({
    label: '',
    type: 'text', // Changed to match database schema
    required: false,
    question_order: 0,
    options: null,
    condition_logic: null
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchForms();
    fetchEvents();
  }, []);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          event:events(name),
          form_questions(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formsWithCount = data?.map(form => ({
        ...form,
        questions_count: form.form_questions?.length || 0
      })) || [];

      setForms(formsWithCount);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les formulaires",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Note: The current schema doesn't have status and event_id fields
    // We'll handle filtering on the frontend for now
    return matchesSearch;
  });

  const createForm = async () => {
    try {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .insert([{
          name: formData.name,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (formError) throw formError;

      // Insert questions
      if (questions.length > 0) {
        const { error: questionsError } = await supabase
          .from('form_questions')
          .insert(
            questions.map((q, index) => ({
              form_id: form.id,
              label: q.label,
              type: q.type,
              required: q.required,
              question_order: index,
              options: q.options,
              condition_logic: q.condition_logic
            }))
          );

        if (questionsError) throw questionsError;
      }

      toast({
        title: "Succès",
        description: "Formulaire créé avec succès"
      });

      setIsCreateModalOpen(false);
      resetFormWizard();
      fetchForms();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le formulaire",
        variant: "destructive"
      });
    }
  };

  const resetFormWizard = () => {
    setCurrentStep(1);
    setFormData({ name: '', event_id: '', status: 'draft' });
    setQuestions([]);
    setCurrentQuestion({
      label: '',
      type: 'text',
      required: false,
      question_order: 0,
      options: null,
      condition_logic: null
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.label) return;
    
    setQuestions([...questions, {
      ...currentQuestion as Omit<FormQuestion, 'id' | 'form_id'>,
      question_order: questions.length
    }]);
    
    setCurrentQuestion({
      label: '',
      type: 'text',
      required: false,
      question_order: questions.length + 1,
      options: null,
      condition_logic: null
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const questionTypes = [
    { value: 'text', label: 'Texte' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Téléphone' },
    { value: 'dropdown', label: 'Liste déroulante' },
    { value: 'checkbox', label: 'Cases à cocher' }
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du formulaire</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Questionnaire de pré-qualification"
              />
            </div>
            <div>
              <Label htmlFor="event">Événement lié (optionnel)</Label>
              <Select onValueChange={(value) => setFormData({ ...formData, event_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un événement" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'draft' })}
              />
              <Label htmlFor="status">Formulaire actif</Label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Ajouter une question</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="question-label">Intitulé de la question</Label>
                  <Input
                    id="question-label"
                    value={currentQuestion.label}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, label: e.target.value })}
                    placeholder="Ex: Quel est votre budget ?"
                  />
                </div>
                <div>
                  <Label htmlFor="question-type">Type de question</Label>
                  <Select 
                    value={currentQuestion.type} 
                    onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(currentQuestion.type === 'dropdown' || currentQuestion.type === 'checkbox') && (
                  <div>
                    <Label>Options de réponse</Label>
                    <Textarea
                      placeholder="Une option par ligne&#10;Option 1&#10;Option 2&#10;Option 3"
                      value={currentQuestion.options?.join('\n') || ''}
                      onChange={(e) => setCurrentQuestion({ 
                        ...currentQuestion, 
                        options: e.target.value.split('\n').filter(o => o.trim()) 
                      })}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="required"
                    checked={currentQuestion.required}
                    onCheckedChange={(checked) => setCurrentQuestion({ ...currentQuestion, required: !!checked })}
                  />
                  <Label htmlFor="required">Question obligatoire</Label>
                </div>
                <Button onClick={addQuestion} disabled={!currentQuestion.label}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter la question
                </Button>
              </div>
            </div>

            {questions.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">Questions ajoutées ({questions.length})</h3>
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{question.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {questionTypes.find(t => t.value === question.type)?.label}
                              {question.required && " • Obligatoire"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Aperçu du formulaire</h3>
            <Card>
              <CardHeader>
                <CardTitle>{formData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <Label className="text-base">{question.label}</Label>
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                      <div className="mt-2">
                        {question.type === 'text' && <Input placeholder="Votre réponse..." disabled />}
                        {question.type === 'email' && <Input type="email" placeholder="votre@email.com" disabled />}
                        {question.type === 'phone' && <Input type="tel" placeholder="+33 6 12 34 56 78" disabled />}
                        {(question.type === 'dropdown' || question.type === 'checkbox') && (
                          <RadioGroup disabled>
                            {question.options?.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={option} />
                                <Label htmlFor={option}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement des formulaires...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Formulaires</h1>
            <p className="text-muted-foreground">{forms.length} formulaire{forms.length !== 1 ? 's' : ''}</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Créer un formulaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un formulaire</DialogTitle>
                <DialogDescription>
                  Étape {currentStep} sur 3
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {renderStep()}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Précédent
                  </Button>
                  
                  {currentStep < 3 ? (
                    <Button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={currentStep === 1 && !formData.name}
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={createForm}>
                      Créer le formulaire
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher un formulaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Événement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredForms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 text-muted-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Aucun formulaire</h3>
                <p className="text-muted-foreground mb-4">
                  Créez votre premier formulaire pour commencer à collecter des informations.
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un formulaire
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Événement lié</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <Link 
                          to={`/forms/${form.id}`}
                          className="text-primary hover:underline"
                        >
                          {form.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Brouillon
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {form.event?.[0]?.name || 'Aucun'}
                      </TableCell>
                      <TableCell>{form.questions_count || 0}</TableCell>
                      <TableCell>
                        {new Date(form.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Forms;