import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FormQuestion {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  required: boolean;
  condition_logic?: any;
}

interface LeadFormProps {
  onFormComplete: (isValid: boolean) => void;
  onContactCreated: (contactId: string) => void;
}

const baseSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  phone: z.string().min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),
});

export const LeadForm: React.FC<LeadFormProps> = ({ onFormComplete, onContactCreated }) => {
  const [dynamicFields, setDynamicFields] = useState<FormQuestion[]>([]);
  const [showSecondaryFields, setShowSecondaryFields] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      firstName: '',
      phone: '',
    },
  });

  const { watch, setValue } = form;
  const firstName = watch('firstName');

  // Fetch form questions on component mount
  useEffect(() => {
    const fetchFormQuestions = async () => {
      try {
        // For demo purposes, we'll create a mock form with some questions
        // In a real app, this would fetch from the forms and form_questions tables
        const mockQuestions: FormQuestion[] = [
          {
            id: '1',
            label: 'Entreprise',
            type: 'text',
            required: false,
          },
          {
            id: '2',
            label: 'Email',
            type: 'email',
            required: true,
          },
          {
            id: '3',
            label: 'Votre objectif principal',
            type: 'select',
            required: false,
          },
        ];
        setDynamicFields(mockQuestions);
      } catch (error) {
        console.error('Error fetching form questions:', error);
      }
    };

    fetchFormQuestions();
  }, []);

  // Show secondary fields when firstName is entered
  useEffect(() => {
    if (firstName && firstName.length >= 2) {
      setShowSecondaryFields(true);
      createOrUpdateContact();
    }
  }, [firstName]);

  const createOrUpdateContact = async () => {
    try {
      const formData = form.getValues();
      
      if (!contactId) {
        // Create new contact
        const { data: contact, error } = await supabase
          .from('contacts')
          .insert([{
            first_name: formData.firstName,
            last_name: '', // Will be updated later if needed
            email: '', // Will be updated when email field is filled
            phone: formData.phone || '',
            status: 'opportunity',
            created_by: '00000000-0000-0000-0000-000000000000', // Mock user ID for demo
          }])
          .select()
          .single();

        if (error) throw error;
        
        if (contact) {
          setContactId(contact.id);
          onContactCreated(contact.id);
        }
      } else {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            first_name: formData.firstName,
            phone: formData.phone || '',
          })
          .eq('id', contactId);

        if (error) throw error;
      }

      // Save form responses
      if (contactId && formId) {
        const responses = [
          { question_id: 'firstName', response: formData.firstName },
          { question_id: 'phone', response: formData.phone },
        ];

        for (const response of responses) {
          if (response.response) {
            await supabase
              .from('form_responses')
              .upsert({
                form_id: formId,
                contact_id: contactId,
                question_id: response.question_id,
                response: response.response,
              });
          }
        }
      }
    } catch (error) {
      console.error('Error creating/updating contact:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = (data: any) => {
    console.log('Form submitted:', data);
    onFormComplete(true);
    toast({
      title: 'Formulaire complété',
      description: 'Vous pouvez maintenant choisir un créneau horaire.',
    });
  };

  const isFormValid = form.formState.isValid && firstName && firstName.length >= 2;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Réservez votre rendez-vous
        </h2>
        <p className="text-muted-foreground">
          Complétez le formulaire pour accéder au calendrier
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
        <div className="space-y-6 flex-1">
          {/* Required Fields */}
          <div className="space-y-4">
            <div className="relative">
              <Label 
                htmlFor="firstName" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  firstName ? 'top-2 text-xs text-primary' : 'top-4 text-sm text-muted-foreground'
                }`}
              >
                Prénom *
              </Label>
              <Input
                id="firstName"
                {...form.register('firstName')}
                className="pt-6 pb-2 h-12 border-2 focus:border-primary"
                onChange={(e) => {
                  form.setValue('firstName', e.target.value);
                  if (e.target.value) createOrUpdateContact();
                }}
              />
              {form.formState.errors.firstName && (
                <p className="text-calendeo-error text-sm mt-1">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div className="relative">
              <Label 
                htmlFor="phone" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  watch('phone') ? 'top-2 text-xs text-primary' : 'top-4 text-sm text-muted-foreground'
                }`}
              >
                Téléphone *
              </Label>
              <Input
                id="phone"
                type="tel"
                {...form.register('phone')}
                className="pt-6 pb-2 h-12 border-2 focus:border-primary"
                onChange={(e) => {
                  form.setValue('phone', e.target.value);
                  if (contactId) createOrUpdateContact();
                }}
              />
              {form.formState.errors.phone && (
                <p className="text-calendeo-error text-sm mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Dynamic Secondary Fields */}
          {showSecondaryFields && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground mb-4">
                  Informations complémentaires
                </h3>
                
                {dynamicFields.map((field) => (
                  <div key={field.id} className="relative mb-4">
                    <Label 
                      htmlFor={field.id}
                      className="absolute left-3 top-2 text-xs text-primary transition-all duration-200"
                    >
                      {field.label} {field.required && '*'}
                    </Label>
                    {field.type === 'select' ? (
                      <select
                        id={field.id}
                        className="w-full pt-6 pb-2 px-3 h-12 border-2 border-input rounded-md focus:border-primary bg-background"
                      >
                        <option value="">Choisir une option</option>
                        <option value="croissance">Croissance de l'entreprise</option>
                        <option value="efficacite">Améliorer l'efficacité</option>
                        <option value="automatisation">Automatisation</option>
                      </select>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type}
                        className="pt-6 pb-2 h-12 border-2 focus:border-primary"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-border">
          <Button 
            type="submit"
            disabled={!isFormValid}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuer
          </Button>
        </div>
      </form>
    </div>
  );
};