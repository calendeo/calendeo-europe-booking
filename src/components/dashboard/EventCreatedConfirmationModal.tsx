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

  console.log("🎭 EventCreatedConfirmationModal rendu avec:", {
    open,
    event,
    eventExists: !!event
  });

  if (!event) {
    console.log("❌ Pas d'événement fourni à la modale");
    return null;
  }

  const bookingUrl = `${window.location.origin}/book/${event.slug || event.id}`;
  console.log("🔗 URL de réservation générée:", bookingUrl);

  const handleCopyLink = async () => {
    console.log("🔗 Tentative de copie du lien:", bookingUrl);
    try {
      await navigator.clipboard.writeText(bookingUrl);
      console.log("✅ Lien copié avec succès");
      toast({
        title: 'Lien copié',
        description: 'Le lien de réservation a été copié dans le presse-papiers.',
      });
    } catch (error) {
      console.error('❌ Erreur lors de la copie:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = bookingUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: 'Lien copié',
          description: 'Le lien de réservation a été copié dans le presse-papiers.',
        });
      } catch (fallbackError) {
        toast({
          title: 'Erreur',
          description: 'Impossible de copier le lien automatiquement.',
          variant: 'destructive',
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleViewEvent = () => {
    console.log("👁️ Ouverture de la page:", bookingUrl);
    try {
      window.open(bookingUrl, '_blank', 'noopener,noreferrer');
      console.log("✅ Page ouverte avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de l'ouverture:", error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ouvrir la page de réservation.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    console.log("📤 Tentative de partage de l'événement:", event.name);
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.name,
          text: `Réservez un créneau pour : ${event.name}`,
          url: bookingUrl,
        });
        console.log("✅ Partage réussi");
      } else {
        console.log("📤 Web Share API non supportée, utilisation de la copie");
        await handleCopyLink();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.log("📤 Partage annulé ou erreur, fallback vers copie");
        await handleCopyLink();
      } else {
        console.log("📤 Partage annulé par l'utilisateur");
      }
    }
  };

  const handleReturnToDashboard = () => {
    console.log("🏠 Retour au dashboard");
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
            <p className="text-xs text-muted-foreground mt-2">
              🔗 {bookingUrl}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={(e) => {
                console.log("🔘 Clic sur bouton Copier");
                e.preventDefault();
                e.stopPropagation();
                handleCopyLink();
              }}
              variant="outline"
              className="w-full gap-2"
              type="button"
            >
              <Copy className="h-4 w-4" />
              Copier le lien de réservation
            </Button>

            <Button
              onClick={(e) => {
                console.log("🔘 Clic sur bouton Voir");
                e.preventDefault();
                e.stopPropagation();
                handleViewEvent();
              }}
              variant="outline"
              className="w-full gap-2"
              type="button"
            >
              <ExternalLink className="h-4 w-4" />
              Voir la page de réservation
            </Button>

            <Button
              onClick={(e) => {
                console.log("🔘 Clic sur bouton Partager");
                e.preventDefault();
                e.stopPropagation();
                handleShare();
              }}
              variant="outline"
              className="w-full gap-2"
              type="button"
            >
              <Share2 className="h-4 w-4" />
              Partager
            </Button>

            <Button
              onClick={(e) => {
                console.log("🔘 Clic sur bouton Retour");
                e.preventDefault();
                e.stopPropagation();
                handleReturnToDashboard();
              }}
              className="w-full gap-2 mt-4"
              type="button"
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