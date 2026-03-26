import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface CommissionPayment {
  id: string;
  salesperson_name: string;
  period_month: number;
  period_year: number;
  paid: boolean;
  paid_at: string | null;
  receipt_url: string | null;
}

export function useCommissionPayments(month: number, year: number) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_month', month)
        .eq('period_year', year);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching commission payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePayment = async (salespersonName: string) => {
    if (!user) return;

    const existingPayment = payments.find(
      p => p.salesperson_name === salespersonName
    );

    try {
      if (existingPayment) {
        const newPaidStatus = !existingPayment.paid;
        const { error } = await supabase
          .from('commission_payments')
          .update({ 
            paid: newPaidStatus,
            paid_at: newPaidStatus ? new Date().toISOString() : null
          })
          .eq('id', existingPayment.id);

        if (error) throw error;

        toast({
          title: newPaidStatus ? "Comissão marcada como paga" : "Comissão desmarcada",
          description: `${salespersonName} - ${month}/${year}`,
        });
      } else {
        const { error } = await supabase
          .from('commission_payments')
          .insert({
            user_id: user.id,
            salesperson_name: salespersonName,
            period_month: month,
            period_year: year,
            paid: true,
            paid_at: new Date().toISOString()
          });

        if (error) throw error;

        toast({
          title: "Comissão marcada como paga",
          description: `${salespersonName} - ${month}/${year}`,
        });
      }

      fetchPayments();
    } catch (error) {
      console.error('Error toggling payment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pagamento.",
        variant: "destructive",
      });
    }
  };

  const uploadReceipt = async (salespersonName: string, file: File) => {
    if (!user) return;

    const existingPayment = payments.find(
      p => p.salesperson_name === salespersonName
    );

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${salespersonName}_${month}_${year}_${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path (not a public URL) — signed URLs are generated on read
      const receiptUrl = fileName;

      if (existingPayment) {
        // Update existing payment with receipt
        const { error } = await supabase
          .from('commission_payments')
          .update({ receipt_url: receiptUrl })
          .eq('id', existingPayment.id);

        if (error) throw error;
      } else {
        // Create new payment record with receipt
        const { error } = await supabase
          .from('commission_payments')
          .insert({
            user_id: user.id,
            salesperson_name: salespersonName,
            period_month: month,
            period_year: year,
            paid: false,
            receipt_url: receiptUrl
          });

        if (error) throw error;
      }

      toast({
        title: "Comprovante anexado",
        description: `Comprovante de ${salespersonName} salvo com sucesso.`,
      });

      fetchPayments();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Erro",
        description: "Não foi possível anexar o comprovante.",
        variant: "destructive",
      });
    }
  };

  const isPaid = (salespersonName: string): boolean => {
    const payment = payments.find(p => p.salesperson_name === salespersonName);
    return payment?.paid || false;
  };

  const getReceiptPath = (salespersonName: string): string | null => {
    const payment = payments.find(p => p.salesperson_name === salespersonName);
    return payment?.receipt_url || null;
  };

  const getSignedReceiptUrl = async (salespersonName: string): Promise<string | null> => {
    const path = getReceiptPath(salespersonName);
    if (!path) return null;

    // Handle legacy full public URLs
    const filePath = path.includes('/storage/v1/') 
      ? path.split('/payment-receipts/')[1] 
      : path;

    if (!filePath) return null;

    const { data, error } = await supabase.storage
      .from('payment-receipts')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

  useEffect(() => {
    fetchPayments();
  }, [user, month, year]);

  return {
    payments,
    loading,
    togglePayment,
    isPaid,
    getReceiptUrl,
    uploadReceipt,
    refetch: fetchPayments
  };
}
