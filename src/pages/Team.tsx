import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Plus, Users, Mail, MoreHorizontal, UserPlus, Crown, Shield, User, Settings, Trash2, Calendar, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  active: boolean;
  calendar_connected: boolean;
  created_at: string;
  priority: number;
  timezone: string;
  slack_id?: string;
  events_count?: number;
  no_show_rate?: number;
  closing_rate?: number;
  revenue?: number;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by: string;
}

interface InviteFormData {
  emails: string;
  role: string;
  message: string;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', icon: Crown, color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'Admin', icon: Shield, color: 'bg-blue-100 text-blue-800' },
  { value: 'closer', label: 'Closer', icon: User, color: 'bg-green-100 text-green-800' },
  { value: 'setter', label: 'Setter', icon: UserPlus, color: 'bg-gray-100 text-gray-800' },
];

const Team = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  
  const [inviteFormData, setInviteFormData] = useState<InviteFormData>({
    emails: '',
    role: 'setter',
    message: '',
  });

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user]);

  useEffect(() => {
    filterMembers();
  }, [teamMembers, searchQuery, roleFilter]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Get current user's profile and team
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('user_id', user?.id)
        .single();

      if (!userData) return;

      setCurrentUserRole(userData.role);

      // Get user's team memberships
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userData.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        setLoading(false);
        return;
      }

      const teamId = teamMemberships[0].team_id;
      setCurrentTeamId(teamId);

      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          users:user_id (
            id,
            user_id,
            first_name,
            last_name,
            email,
            role,
            active,
            calendar_connected,
            created_at,
            priority,
            timezone,
            slack_id
          )
        `)
        .eq('team_id', teamId);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement de l'équipe",
          variant: "destructive",
        });
        return;
      }

      // Transform data and calculate KPIs
      const members = (membersData || []).map(member => {
        const userInfo = member.users;
        return {
          id: member.id,
          user_id: userInfo.user_id,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          email: userInfo.email,
          role: userInfo.role,
          active: userInfo.active,
          calendar_connected: userInfo.calendar_connected,
          created_at: userInfo.created_at,
          priority: userInfo.priority,
          timezone: userInfo.timezone,
          slack_id: userInfo.slack_id,
          events_count: Math.floor(Math.random() * 50), // Mock data
          no_show_rate: Math.floor(Math.random() * 30), // Mock data
          closing_rate: Math.floor(Math.random() * 60) + 20, // Mock data
          revenue: Math.floor(Math.random() * 10000) + 1000, // Mock data
        } as TeamMember;
      });

      setTeamMembers(members);

      // Fetch pending invitations
      if (userData.role === 'admin' || userData.role === 'super_admin') {
        const { data: invitationsData } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_id', teamId)
          .eq('status', 'pending');

        setInvitations(invitationsData || []);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = teamMembers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = teamMembers.filter(member =>
        member.first_name.toLowerCase().includes(query) ||
        member.last_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    setFilteredMembers(filtered);
  };

  const getFullName = (member: TeamMember) => {
    return `${member.first_name} ${member.last_name}`.trim();
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[3];
  };

  const handleInviteMembers = async () => {
    try {
      const emails = inviteFormData.emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      if (emails.length === 0) {
        toast({
          title: "Erreur",
          description: "Veuillez saisir au moins un email",
          variant: "destructive",
        });
        return;
      }

      // Get current user ID first
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!userData) {
        toast({
          title: "Erreur",
          description: "Utilisateur non trouvé",
          variant: "destructive",
        });
        return;
      }

      for (const email of emails) {
        const { error } = await supabase
          .from('team_invitations')
          .insert({
            email,
            team_id: currentTeamId,
            role: inviteFormData.role as 'super_admin' | 'admin' | 'closer' | 'setter',
            invited_by: userData.id,
            status: 'pending',
          });

        if (error) {
          console.error('Error creating invitation:', error);
          toast({
            title: "Erreur",
            description: `Erreur lors de l'invitation de ${email}`,
            variant: "destructive",
          });
          continue;
        }
      }

      toast({
        title: "Succès",
        description: `${emails.length} invitation(s) envoyée(s)`,
      });

      setIsInviteModalOpen(false);
      setInviteFormData({ emails: '', role: 'setter', message: '' });
      fetchTeamData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'envoi des invitations",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error removing member:', error);
        toast({
          title: "Erreur",
          description: "Erreur lors de la suppression du membre",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succès",
        description: `${memberName} a été supprimé de l'équipe`,
      });

      fetchTeamData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const canManageTeam = currentUserRole === 'admin' || currentUserRole === 'super_admin';

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-6"></div>
            <div className="h-10 bg-muted rounded w-full mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
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
            <h1 className="text-2xl font-semibold text-foreground">
              Équipe ({filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''})
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les membres de votre équipe et leurs performances
            </p>
          </div>
          
          {canManageTeam && (
            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un membre
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Inviter de nouveaux membres</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emails">Emails (séparés par des virgules)</Label>
                    <Textarea
                      id="emails"
                      placeholder="email1@example.com, email2@example.com"
                      value={inviteFormData.emails}
                      onChange={(e) => setInviteFormData({...inviteFormData, emails: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Rôle</Label>
                    <Select value={inviteFormData.role} onValueChange={(value) => setInviteFormData({...inviteFormData, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <role.icon className="h-4 w-4" />
                              {role.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="message">Message personnalisé (optionnel)</Label>
                    <Textarea
                      id="message"
                      placeholder="Rejoignez notre équipe..."
                      value={inviteFormData.message}
                      onChange={(e) => setInviteFormData({...inviteFormData, message: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleInviteMembers}>
                      Envoyer les invitations
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un membre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && canManageTeam && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invitations en attente ({invitations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations.map(invitation => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invitation.email}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getRoleInfo(invitation.role).label}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        {filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {teamMembers.length === 0 ? 'Aucun membre pour le moment' : 'Aucun membre trouvé'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {teamMembers.length === 0 
                    ? 'Invitez vos premiers membres pour commencer à collaborer.'
                    : 'Essayez d\'ajuster vos filtres de recherche.'
                  }
                </p>
                {canManageTeam && teamMembers.length === 0 && (
                  <Button onClick={() => setIsInviteModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Inviter des membres
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : isMobile ? (
          /* Mobile: Card Layout */
          <div className="space-y-4">
            {filteredMembers.map(member => {
              const roleInfo = getRoleInfo(member.role);
              return (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <roleInfo.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{getFullName(member)}</h3>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        {canManageTeam && member.user_id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Modifier le profil
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Crown className="h-4 w-4 mr-2" />
                                Changer de rôle
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer le membre</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer {getFullName(member)} de l'équipe ? Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRemoveMember(member.id, getFullName(member))}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <Badge className={roleInfo.color}>
                          {roleInfo.label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={member.calendar_connected ? 'text-green-600' : 'text-red-600'}>
                            {member.calendar_connected ? '🟢' : '🔴'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">RDV traités:</span>
                          <p className="font-medium">{member.events_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Taux closing:</span>
                          <p className="font-medium">{member.closing_rate}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Desktop: Table Layout */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Calendrier</TableHead>
                  <TableHead>RDV traités</TableHead>
                  <TableHead>Taux no-show</TableHead>
                  <TableHead>Taux closing</TableHead>
                  <TableHead>Revenus générés</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map(member => {
                  const roleInfo = getRoleInfo(member.role);
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <roleInfo.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{getFullName(member)}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleInfo.color}>
                          {roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={member.calendar_connected ? 'text-green-600' : 'text-red-600'}>
                            {member.calendar_connected ? '🟢' : '🔴'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {member.calendar_connected ? 'Connecté' : 'Déconnecté'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{member.events_count}</TableCell>
                      <TableCell>{member.no_show_rate}%</TableCell>
                      <TableCell>{member.closing_rate}%</TableCell>
                      <TableCell>{member.revenue?.toLocaleString('fr-FR')}€</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="Voir le profil public">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {canManageTeam && member.user_id !== user?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Modifier le profil
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Crown className="h-4 w-4 mr-2" />
                                  Changer de rôle
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer le membre</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Êtes-vous sûr de vouloir supprimer {getFullName(member)} de l'équipe ? Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleRemoveMember(member.id, getFullName(member))}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Team;