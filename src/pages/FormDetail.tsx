import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Download, Edit, ChevronDown, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FormData {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  event?: {
    name: string;
  }[];
}

interface FormQuestion {
  id: string;
  form_id: string;
  label: string;
  type: string;
  required: boolean;
  condition_logic: any;
  created_at: string;
}

interface FormResponse {
  id: string;
  form_id: string;
  contact_id: string;
  question_id: string;
  response: string;
  created_at: string;
  contact?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

const FormDetail = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<FormData | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (formId) {
      fetchFormData();
      fetchQuestions();
      fetchResponses();
    }
  }, [formId]);

  const fetchFormData = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          event:events(name)
        `)
        .eq('id', formId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Erreur",
          description: "Formulaire introuvable",
          variant: "destructive"
        });
        navigate('/forms');
        return;
      }

      setForm(data);
    } catch (error) {
      console.error('Error fetching form:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le formulaire",
        variant: "destructive"
      });
      navigate('/forms');
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('form_questions')
        .select('*')
        .eq('form_id', formId)
        .order('created_at');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('form_responses')
        .select(`
          *,
          contact:contacts(email, first_name, last_name)
        `)
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (responseId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié",
      description: "Texte copié dans le presse-papiers"
    });
  };

  const exportToCSV = () => {
    const headers = ['Date de soumission', 'Email', 'Prénom', 'Nom', ...questions.map(q => q.label)];
    const csvData = responses.map(response => {
      const row = [
        new Date(response.created_at).toLocaleDateString('fr-FR'),
        response.contact?.email || '',
        response.contact?.first_name || '',
        response.contact?.last_name || '',
        response.response || ''
      ];
      
      return row;
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${form?.name || 'formulaire'}-reponses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export réussi",
      description: "Le fichier CSV a été téléchargé"
    });
  };

  const filteredResponses = responses.filter(response =>
    response.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.contact?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.contact?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAnswerValue = (response: FormResponse) => {
    if (!response.response) return '-';
    return String(response.response);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement du formulaire...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!form) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Formulaire introuvable</h2>
          <Link to="/forms">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux formulaires
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/forms">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{form.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{responses.length} réponse{responses.length !== 1 ? 's' : ''}</span>
                {form.event?.[0] && (
                  <>
                    <span>•</span>
                    <span>Lié à: {form.event[0].name}</span>
                  </>
                )}
                <span>•</span>
                <span>Créé le {new Date(form.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {responses.length === 0 && (
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Modifier le formulaire
              </Button>
            )}
            {responses.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
            )}
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>
        </div>

        {/* Questions Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Questions du formulaire ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                    <span className="font-medium">{question.label}</span>
                    {question.required && <Badge variant="secondary" className="text-xs">Obligatoire</Badge>}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {question.type === 'text' ? 'Texte' : 
                     question.type === 'email' ? 'Email' :
                     question.type === 'phone' ? 'Téléphone' :
                     question.type === 'dropdown' ? 'Liste' :
                     question.type === 'checkbox' ? 'Cases' : question.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Responses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Réponses ({filteredResponses.length})</CardTitle>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Rechercher par email ou nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredResponses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 text-muted-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Aucune réponse pour l'instant</h3>
                <p className="text-muted-foreground mb-4">
                  Partagez votre formulaire pour commencer à collecter des réponses.
                </p>
                <Button>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Partager le formulaire
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResponses.slice(0, pageSize).map((response) => (
                  <Card key={response.id} className="border-l-4 border-l-primary/20">
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                {expandedRows.has(response.id) ? 
                                  <ChevronDown className="w-4 h-4" /> : 
                                  <ChevronRight className="w-4 h-4" />
                                }
                                <div>
                                  <div className="font-medium">
                                    {response.contact?.first_name} {response.contact?.last_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span>{response.contact?.email}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(response.contact?.email || '');
                                      }}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(response.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            <div className="border-l-2 border-l-muted pl-4">
                              <div className="font-medium text-sm text-muted-foreground mb-1">
                                Réponse
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-foreground">
                                  {renderAnswerValue(response)}
                                </span>
                                {response.response && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => copyToClipboard(renderAnswerValue(response))}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FormDetail;