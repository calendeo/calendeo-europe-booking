import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Palette, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: string;
  name: string;
  duration: number;
  type: string;
  status: string;
}

interface ShareEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export const ShareEventModal: React.FC<ShareEventModalProps> = ({
  open,
  onOpenChange,
  event,
}) => {
  const [embedType, setEmbedType] = useState<'inline' | 'popup'>('inline');
  const [customColors, setCustomColors] = useState({
    background: '#ffffff',
    text: '#1a1a1a',
    button: '#1a6be3',
  });
  const { toast } = useToast();

  if (!event) return null;

  const eventLink = `${window.location.origin}/book/${event.id}`;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié !',
      description: message,
    });
  };

  const generateEmbedCode = () => {
    if (embedType === 'inline') {
      return `<iframe 
  src="${eventLink}" 
  width="100%" 
  height="600"
  frameborder="0"
  style="border: none; background: ${customColors.background};">
</iframe>`;
    } else {
      return `<script>
  (function() {
    var button = document.createElement('button');
    button.innerText = 'Prendre rendez-vous';
    button.style.cssText = \`
      background: ${customColors.button};
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-family: Inter, sans-serif;
      font-weight: 600;
    \`;
    button.onclick = function() {
      window.open('${eventLink}', '_blank', 'width=800,height=600');
    };
    document.currentScript.parentNode.insertBefore(button, document.currentScript);
  })();
</script>`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Partager : {event.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="link">Partager un lien</TabsTrigger>
            <TabsTrigger value="embed">Ajouter à un site</TabsTrigger>
            <TabsTrigger value="preview">Ouvrir dans un nouvel onglet</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lien direct</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Partagez ce lien directement avec vos clients pour qu'ils puissent réserver un créneau.
                </p>
                <div className="flex gap-2">
                  <Input value={eventLink} readOnly />
                  <Button 
                    onClick={() => copyToClipboard(eventLink, 'Lien copié dans le presse-papier')}
                    variant="outline"
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Personnalisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={embedType === 'inline' ? 'default' : 'outline'}
                    onClick={() => setEmbedType('inline')}
                    className="flex-1"
                  >
                    Incorporation inline
                  </Button>
                  <Button
                    variant={embedType === 'popup' ? 'default' : 'outline'}
                    onClick={() => setEmbedType('popup')}
                    className="flex-1"
                  >
                    Widget pop-up
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Couleur de fond</Label>
                    <Input
                      type="color"
                      value={customColors.background}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, background: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur du texte</Label>
                    <Input
                      type="color"
                      value={customColors.text}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, text: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur du bouton</Label>
                    <Input
                      type="color"
                      value={customColors.button}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, button: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Code HTML
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 gap-1"
                    onClick={() => copyToClipboard(generateEmbedCode(), 'Code HTML copié')}
                  >
                    <Copy className="h-3 w-3" />
                    Copier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aperçu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{event.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{event.duration} min</span>
                      <Badge variant="outline">{event.type}</Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ouvrez votre événement dans un nouvel onglet pour voir exactement ce que vos clients verront.
                </p>
                <Button 
                  onClick={() => window.open(eventLink, '_blank')}
                  className="w-full gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir l'événement
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};