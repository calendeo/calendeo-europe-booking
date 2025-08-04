import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Download, TrendingUp, Users, Clock, DollarSign, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  date_time: string;
  status: 'confirmed' | 'canceled' | 'rescheduled'; // Updated to match actual database schema
  guest_id: string;
  host_ids: string[];
  created_by: string;
  duration: number;
  contact?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  hosts?: {
    first_name: string;
    last_name: string;
  }[];
}

interface KPIData {
  totalBookings: number;
  noShowRate: number;
  closingRate: number;
  revenue: number;
}

interface ChartData {
  date: string;
  bookings: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const Analytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchUserRole();
    fetchTeamMembers();
    fetchEvents();
  }, [dateRange, statusFilter, memberFilter]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserRole(data?.role || '');
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchTeamMembers = async () => {
    if (!['admin', 'super_admin'].includes(userRole)) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('events')
        .select(`
          *,
          contact:contacts(first_name, last_name, email)
        `)
        .gte('date_time', `${dateRange.start}T00:00:00`)
        .lte('date_time', `${dateRange.end}T23:59:59`)
        .order('date_time', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'confirmed' | 'canceled' | 'rescheduled');
      }

      // Apply member filter for admins
      if (memberFilter !== 'all' && ['admin', 'super_admin'].includes(userRole)) {
        query = query.eq('created_by', memberFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données analytiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPIData => {
    const totalBookings = events.length;
    const confirmedBookings = events.filter(e => e.status === 'confirmed').length;
    const cancelledBookings = events.filter(e => e.status === 'canceled').length;
    
    // Using canceled as no-show for demo purposes
    const noShowRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    const closingRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;
    
    // Mock revenue calculation (duration * hourly rate)
    const revenue = events
      .filter(e => e.status === 'confirmed')
      .reduce((sum, e) => sum + (e.duration * 50), 0); // 50€ per hour as example

    return {
      totalBookings,
      noShowRate,
      closingRate,
      revenue
    };
  };

  const getChartData = (): ChartData[] => {
    const dateMap = new Map<string, number>();
    
    events.forEach(event => {
      const date = format(parseISO(event.date_time), 'yyyy-MM-dd');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries())
      .map(([date, bookings]) => ({ date, bookings }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getStatusData = (): StatusData[] => {
    const statusCount = {
      confirmed: events.filter(e => e.status === 'confirmed').length,
      canceled: events.filter(e => e.status === 'canceled').length,
      rescheduled: events.filter(e => e.status === 'rescheduled').length
    };

    return [
      { name: 'Honoré', value: statusCount.confirmed, color: '#22c55e' },
      { name: 'Annulé', value: statusCount.canceled, color: '#ef4444' },
      { name: 'Reprogrammé', value: statusCount.rescheduled, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  };

  const exportToCSV = () => {
    const headers = ['Événement', 'Membre', 'Date', 'Statut', 'Durée (min)', 'Contact'];
    const csvData = events.map(event => [
      event.name,
      `${event.contact?.first_name || ''} ${event.contact?.last_name || ''}`.trim(),
      format(parseISO(event.date_time), 'dd/MM/yyyy HH:mm', { locale: fr }),
      event.status === 'confirmed' ? 'Honoré' : 
      event.status === 'canceled' ? 'Annulé' : 'Reprogrammé',
      event.duration.toString(),
      event.contact?.email || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export réussi",
      description: "Le fichier CSV a été téléchargé"
    });
  };

  const kpis = calculateKPIs();
  const chartData = getChartData();
  const statusData = getStatusData();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Honoré</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'rescheduled':
        return <Badge variant="secondary">Reprogrammé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">
            Analysez les performances de votre équipe et identifiez les opportunités d'amélioration
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Période</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="px-3 py-2 border border-border rounded-md text-sm"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="px-3 py-2 border border-border rounded-md text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Statut</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="confirmed">Honoré</SelectItem>
                    <SelectItem value="canceled">Annulé</SelectItem>
                    <SelectItem value="rescheduled">Reprogrammé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {['admin', 'super_admin'].includes(userRole) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Membre de l'équipe</label>
                  <Select value={memberFilter} onValueChange={setMemberFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les membres</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nombre de rendez-vous</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{kpis.totalBookings}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de no-show</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{kpis.noShowRate.toFixed(1)}%</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de closing</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{kpis.closingRate.toFixed(1)}%</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenu généré</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{kpis.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des rendez-vous</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(parseISO(date), 'dd/MM', { locale: fr })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(parseISO(date), 'dd MMMM yyyy', { locale: fr })}
                      formatter={(value) => [value, 'Rendez-vous']}
                    />
                    <Bar dataKey="bookings" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Aucune donnée à afficher pour cette période
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Aucune donnée à afficher pour cette période
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Détail des rendez-vous ({events.length})</CardTitle>
              <Button onClick={exportToCSV} variant="outline" disabled={events.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom de l'événement</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead className="text-right">Revenu estimé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <div>
                          <div>{event.contact?.first_name} {event.contact?.last_name}</div>
                          <div className="text-sm text-muted-foreground">{event.contact?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(event.date_time), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell>{event.duration} min</TableCell>
                      <TableCell className="text-right">
                        {event.status === 'confirmed' 
                          ? (event.duration * 50).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 text-muted-foreground">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M3 3v18h18" />
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Aucune donnée à afficher</h3>
                <p className="text-muted-foreground">
                  Aucun rendez-vous trouvé pour la période et les filtres sélectionnés.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Analytics;