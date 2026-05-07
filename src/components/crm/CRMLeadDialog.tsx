import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CRMLead, CRMStage, CreateLeadData } from '@/hooks/useCRMLeads';

const leadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  estimated_value: z.coerce.number().min(0).optional(),
  product: z.string().max(100).optional(),
  salesperson_name: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  follow_up_date: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface CRMLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: CRMLead | null;
  defaultStage?: CRMStage;
  salespeople?: string[];
  onSave: (data: CreateLeadData) => Promise<void>;
  onUpdate?: (id: string, data: Partial<CRMLead>) => Promise<void>;
}

export function CRMLeadDialog({
  open,
  onOpenChange,
  lead,
  defaultStage = 'novo_lead',
  salespeople = [],
  onSave,
  onUpdate,
}: CRMLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!lead;
  const safeSalespeople = Array.from(new Set(salespeople.map((name) => name?.trim()).filter(Boolean)));

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      estimated_value: 0,
      product: '',
      salesperson_name: '',
      notes: '',
      follow_up_date: '',
    },
  });

  useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name,
        phone: lead.phone || '',
        email: lead.email || '',
        estimated_value: lead.estimated_value || 0,
        product: lead.product || '',
        salesperson_name: lead.salesperson_name || '',
        notes: lead.notes || '',
        follow_up_date: (lead as any).follow_up_date || '',
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        email: '',
        estimated_value: 0,
        product: '',
        salesperson_name: '',
        notes: '',
        follow_up_date: '',
      });
    }
  }, [lead, form]);

  const handleSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && onUpdate && lead) {
        await onUpdate(lead.id, {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          estimated_value: data.estimated_value || 0,
          product: data.product || null,
          salesperson_name: data.salesperson_name || null,
          notes: data.notes || null,
          follow_up_date: data.follow_up_date || null,
        } as any);
      } else {
        await onSave({
          name: data.name,
          phone: data.phone,
          email: data.email,
          estimated_value: data.estimated_value,
          product: data.product,
          salesperson_name: data.salesperson_name,
          notes: data.notes,
          stage: defaultStage,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Lead' : 'Novo Lead'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do lead" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Estimado (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Produto de interesse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="salesperson_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {safeSalespeople.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximo Follow-up</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o lead..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Lead'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
