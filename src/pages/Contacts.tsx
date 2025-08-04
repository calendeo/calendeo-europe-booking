import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Users, Mail, Phone, Building, Calendar, MoreHorizontal, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  utm_data: any;
  created_at: string;
  assigned_to: string | null;
  created_by: string;
  events?: {
    id: string;
    name: string;
    date_time: string;
    type: string;
  }[];
}

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  tags: string;
}

const Contacts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    tags: '',
  });

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      
      // Get current user's ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userData) return;

      // Fetch contacts for events created by the current user
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          events:events!events_guest_id_fkey (
            id,
            name,
            date_time,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement des contacts",
          variant: "destructive",
        });
        return;
      }

      setContacts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = contacts.filter(contact =>
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        (contact.phone && contact.phone.toLowerCase().includes(query))
      );
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredContacts(filtered);
  };

  const getFullName = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name}`.trim();
  };

  const getContactEvents = (contact: Contact) => {
    return contact.events || [];
  };

  const getFirstBookedDate = (contact: Contact) => {
    const events = getContactEvents(contact);
    if (events.length === 0) return '-';
    
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
    );
    
    return format(parseISO(sortedEvents[0].date_time), 'dd/MM/yyyy', { locale: fr });
  };

  const getLastBookedDate = (contact: Contact) => {
    const events = getContactEvents(contact);
    if (events.length === 0) return '-';
    
    const sortedEvents = [...events].sort((a, b) => 
      new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
    );
    
    return format(parseISO(sortedEvents[0].date_time), 'dd/MM/yyyy', { locale: fr });
  };

  const handleCreateContact = async () => {
    try {
      // Get current user's ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userData) return;

      const { error } = await supabase
        .from('contacts')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          created_by: userData.id,
          status: 'opportunity',
          timezone: 'UTC'
        });

      if (error) {
        console.error('Error creating contact:', error);
        toast({
          title: "Erreur",
          description: "Erreur lors de la création du contact",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succès",
        description: "Contact créé avec succès",
      });

      setIsCreateModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        tags: '',
      });
      
      fetchContacts();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du contact",
        variant: "destructive",
      });
    }
  };

  const openContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-6"></div>
            <div className="h-10 bg-muted rounded w-full mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
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
            <h1 className="text-2xl font-semibold text-foreground">Mes contacts</h1>
            <p className="text-muted-foreground mt-1">
              {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''} trouvé{filteredContacts.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      placeholder="Dupont"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="jean.dupont@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    placeholder="Mon entreprise"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="prospect, vip, lead"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleCreateContact}
                    disabled={!formData.first_name || !formData.last_name || !formData.email}
                  >
                    Créer le contact
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un contact…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contacts Table/Cards */}
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucun contact trouvé.
                </h3>
                <p className="text-muted-foreground mb-6">
                  Commencez par créer votre premier contact ou ajustez vos filtres de recherche.
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un contact
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-4">
            {filteredContacts.map(contact => (
              <Card key={contact.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openContactDetails(contact)}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground">{getFullName(contact)}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {contact.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{contact.email}</span>
                      </div>
                      
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Dernier RDV: {getLastBookedDate(contact)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Desktop: Table Layout */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Premier rendez-vous</TableHead>
                  <TableHead>Dernier rendez-vous</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map(contact => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openContactDetails(contact)}>
                    <TableCell className="font-medium">
                      {getFullName(contact)}
                    </TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {contact.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getFirstBookedDate(contact)}</TableCell>
                    <TableCell>{getLastBookedDate(contact)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openContactDetails(contact); }}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Contact Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails du contact</DialogTitle>
            </DialogHeader>
            {selectedContact && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nom complet</Label>
                    <p className="font-medium">{getFullName(selectedContact)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant="secondary" className="text-xs">
                        {selectedContact.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{selectedContact.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Téléphone</Label>
                    <p>{selectedContact.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Premier rendez-vous</Label>
                    <p>{getFirstBookedDate(selectedContact)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dernier rendez-vous</Label>
                    <p>{getLastBookedDate(selectedContact)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Rendez-vous ({getContactEvents(selectedContact).length})</Label>
                  {getContactEvents(selectedContact).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucun rendez-vous trouvé</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {getContactEvents(selectedContact).map(event => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{event.name}</p>
                            <p className="text-sm text-muted-foreground">{event.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{format(parseISO(event.date_time), 'dd/MM/yyyy', { locale: fr })}</p>
                            <p className="text-sm text-muted-foreground">{format(parseISO(event.date_time), 'HH:mm', { locale: fr })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                    Fermer
                  </Button>
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Contacts;