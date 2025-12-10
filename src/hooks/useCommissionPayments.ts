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
        // Update existing payment
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
        // Insert new payment record
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

  const isPaid = (salespersonName: string): boolean => {
    const payment = payments.find(p => p.salesperson_name === salespersonName);
    return payment?.paid || false;
  };

  useEffect(() => {
    fetchPayments();
  }, [user, month, year]);

  return {
    payments,
    loading,
    togglePayment,
    isPaid,
    refetch: fetchPayments
  };
}
