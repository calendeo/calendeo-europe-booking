import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Share2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  name: string;
  slug?: string;
}

interface EventCreatedConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onReturnToDashboard: () => void;
}

export const EventCreatedConfirmationModal: React.FC<EventCreatedConfirmationModalProps> = ({
  open,
  onOpenChange,
  event,
  onReturnToDashboard,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!event) return null;

  const bookingUrl = `${window.location.origin}/book/${event.slug || event.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast({
        title: 'Lien copié',
        description: 'Le lien de réservation a été copié dans le presse-papiers.',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de copier le lien.',
        variant: 'destructive',
      });
    }
  };

  const handleViewEvent = () => {
    window.open(bookingUrl, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Réservez un créneau pour : ${event.name}`,
          url: bookingUrl,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Fallback to copy if share was canceled or failed
          handleCopyLink();
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopyLink();
    }
  };

  const handleReturnToDashboard = () => {
    onOpenChange(false);
    onReturnToDashboard();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            🎉 Événement créé avec succès !
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-foreground">{event.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Votre événement est maintenant disponible pour les réservations
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full gap-2"
            >
              <Copy className="h-4 w-4" />
              Copier le lien de réservation
            </Button>

            <Button
              onClick={handleViewEvent}
              variant="outline"
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Voir la page de réservation
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full gap-2"
            >
              <Share2 className="h-4 w-4" />
              Partager
            </Button>

            <Button
              onClick={handleReturnToDashboard}
              className="w-full gap-2 mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};