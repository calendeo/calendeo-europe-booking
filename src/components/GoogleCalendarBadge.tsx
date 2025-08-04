import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GoogleCalendarBadgeProps {
  className?: string;
}

export const GoogleCalendarBadge: React.FC<GoogleCalendarBadgeProps> = ({ className }) => {
  return (
    <Badge variant="secondary" className={`bg-emerald-50 text-emerald-700 border-emerald-200 ${className}`}>
      <CheckCircle className="w-3 h-3 mr-1" />
      Connecté à Google Calendar
    </Badge>
  );
};