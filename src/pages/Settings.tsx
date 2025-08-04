import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Bell, Globe, Clock, AlertTriangle, Camera } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  timezone: string;
}

interface UserPreferences {
  email_notifications: boolean;
  internal_notifications: boolean;
  reminder_minutes: number;
  language: string;
  time_format: '12h' | '24h';
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    internal_notifications: true,
    reminder_minutes: 15,
    language: 'fr',
    time_format: '24h',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserPreferences();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, timezone')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          ...data,
          email: user?.email || data.email,
        });
      } else {
        // Create a default profile if none exists
        setProfile({
          id: '',
          first_name: '',
          last_name: '',
          email: user?.email || '',
          timezone: 'Europe/Paris',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Create a fallback profile even on error
      setProfile({
        id: '',
        first_name: '',
        last_name: '',
        email: user?.email || '',
        timezone: 'Europe/Paris',
      });
      toast({
        title: 'Information',
        description: 'Profil créé automatiquement. Veuillez remplir vos informations.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    // Mock preferences - in a real app, you'd fetch from a preferences table
    setPreferences({
      email_notifications: true,
      internal_notifications: true,
      reminder_minutes: 15,
      language: 'fr',
      time_format: '24h',
    });
  };

  const updateProfile = async () => {
    if (!profile) return;
    
    setSaving('profile');
    try {
      // Check if user exists, if not create them first
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!existingUser) {
        // Create new user record
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            user_id: user?.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            timezone: profile.timezone,
          });

        if (insertError) throw insertError;
      } else {
        // Update existing user record
        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: profile.first_name,
            last_name: profile.last_name,
            timezone: profile.timezone,
          })
          .eq('user_id', user?.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Succès',
        description: 'Vos informations ont été mises à jour.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour votre profil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updatePreferences = async () => {
    setSaving('preferences');
    try {
      // In a real app, you'd save to a preferences table
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      
      toast({
        title: 'Succès',
        description: 'Vos préférences ont été enregistrées.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos préférences.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const updateNotifications = async () => {
    setSaving('notifications');
    try {
      // In a real app, you'd save to a preferences table
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      
      toast({
        title: 'Succès',
        description: 'Vos préférences de notification ont été enregistrées.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos préférences de notification.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast({
        title: 'Erreur',
        description: 'Veuillez taper "SUPPRIMER" pour confirmer.',
        variant: 'destructive',
      });
      return;
    }

    setSaving('delete');
    try {
      // In a real app, you'd call an edge function to handle account deletion
      await signOut();
      toast({
        title: 'Compte supprimé',
        description: 'Votre compte a été supprimé avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer votre compte.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading || !profile) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
            <p className="text-muted-foreground mt-2">
              Gérez vos informations personnelles et préférences.
            </p>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos informations personnelles et préférences.
          </p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations du compte
            </CardTitle>
            <CardDescription>
              Modifiez vos informations personnelles et votre photo de profil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Photo de profil</p>
                <p className="text-xs text-muted-foreground">
                  Cliquez pour changer votre avatar
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  placeholder="Votre prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <Badge variant="outline" className="text-xs">
                  Non modifiable
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Select
                value={profile.timezone}
                onValueChange={(value) => setProfile({ ...profile, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre fuseau horaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={updateProfile} 
              disabled={saving === 'profile'}
              className="w-full md:w-auto"
            >
              {saving === 'profile' ? 'Mise à jour...' : 'Mettre à jour mes informations'}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configurez vos préférences de notification et rappels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications par email</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir un email de rappel avant chaque rendez-vous
                </p>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, email_notifications: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications internes</Label>
                <p className="text-xs text-muted-foreground">
                  Afficher les notifications dans l'application
                </p>
              </div>
              <Switch
                checked={preferences.internal_notifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, internal_notifications: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Rappel avant rendez-vous</Label>
              <Select
                value={preferences.reminder_minutes.toString()}
                onValueChange={(value) => 
                  setPreferences({ ...preferences, reminder_minutes: parseInt(value) })
                }
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes avant</SelectItem>
                  <SelectItem value="15">15 minutes avant</SelectItem>
                  <SelectItem value="30">30 minutes avant</SelectItem>
                  <SelectItem value="60">1 heure avant</SelectItem>
                  <SelectItem value="1440">1 jour avant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={updateNotifications} 
              disabled={saving === 'notifications'}
              className="w-full md:w-auto"
            >
              {saving === 'notifications' ? 'Enregistrement...' : 'Enregistrer mes préférences'}
            </Button>
          </CardContent>
        </Card>

        {/* General Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Préférences générales
            </CardTitle>
            <CardDescription>
              Configurez la langue, le format horaire et autres préférences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => 
                    setPreferences({ ...preferences, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format horaire</Label>
                <Select
                  value={preferences.time_format}
                  onValueChange={(value: '12h' | '24h') => 
                    setPreferences({ ...preferences, time_format: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 heures (14:30)</SelectItem>
                    <SelectItem value="12h">12 heures (2:30 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={updatePreferences} 
              disabled={saving === 'preferences'}
              className="w-full md:w-auto"
            >
              {saving === 'preferences' ? 'Enregistrement...' : 'Enregistrer les préférences'}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zone de danger
            </CardTitle>
            <CardDescription>
              Actions irréversibles sur votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <h3 className="font-medium text-destructive mb-2">Supprimer définitivement mon compte</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cette action supprimera définitivement votre compte ainsi que toutes les données associées. 
                  Cette action ne peut pas être annulée.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={saving === 'delete'}>
                      {saving === 'delete' ? 'Suppression...' : 'Supprimer mon compte'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action ne peut pas être annulée. Cela supprimera définitivement votre 
                        compte et toutes vos données de nos serveurs.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="deleteConfirm">
                          Pour confirmer, tapez <strong>SUPPRIMER</strong> dans le champ ci-dessous :
                        </Label>
                        <Input
                          id="deleteConfirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="SUPPRIMER"
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteConfirmation !== 'SUPPRIMER'}
                      >
                        Supprimer définitivement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;