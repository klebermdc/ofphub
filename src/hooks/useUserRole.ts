import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'manager' | 'salesperson' | 'marketing';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  salesperson_name: string | null;
  created_at: string;
}

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [salespersonName, setSalespersonName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRole = useCallback(async () => {
    if (!userId) {
      setRole(null);
      setSalespersonName(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user role:', error);
        setRole(null);
        setSalespersonName(null);
      } else if (data) {
        setRole(data.role as AppRole);
        setSalespersonName(data.salesperson_name);
      } else {
        setRole(null);
        setSalespersonName(null);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setRole(null);
      setSalespersonName(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Assign manager role to current user (first user only)
  const assignManagerRole = async () => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .rpc('assign_first_manager', { _user_id: userId });

      if (error) throw error;
      
      if (data) {
        setRole('manager');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error assigning manager role:', error);
      return false;
    }
  };

  return { role, salespersonName, isLoading, loadRole, assignManagerRole };
}

// Hook for managers to manage salesperson accounts
export function useSalespersonAccounts(userId: string | undefined) {
  const [accounts, setAccounts] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'salesperson');

      if (error) throw error;
      setAccounts((data || []) as UserRole[]);
    } catch (error) {
      console.error('Error loading salesperson accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const linkSalesperson = async (salespersonUserId: string, salespersonName: string) => {
    try {
      const { data, error } = await supabase
        .rpc('link_salesperson', { 
          _target_user_id: salespersonUserId, 
          _salesperson_name: salespersonName 
        });

      if (error) throw error;
      
      if (data) {
        await loadAccounts();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error linking salesperson:', error);
      return false;
    }
  };

  const unlinkSalesperson = async (salespersonUserId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', salespersonUserId);

      if (error) throw error;
      await loadAccounts();
      return true;
    } catch (error) {
      console.error('Error unlinking salesperson:', error);
      return false;
    }
  };

  return { accounts, isLoading, loadAccounts, linkSalesperson, unlinkSalesperson };
}

// Hook for managers to manage marketing accounts
export function useMarketingAccounts(userId: string | undefined) {
  const [accounts, setAccounts] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'marketing');

      if (error) throw error;
      setAccounts((data || []) as UserRole[]);
    } catch (error) {
      console.error('Error loading marketing accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const linkMarketing = async (targetUserId: string) => {
    try {
      // Using any type cast until types regenerate
      const { data, error } = await (supabase.rpc as any)('link_marketing', { 
        _target_user_id: targetUserId
      });

      if (error) throw error;
      
      if (data) {
        await loadAccounts();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error linking marketing:', error);
      return false;
    }
  };

  const unlinkMarketing = async (marketingUserId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', marketingUserId);

      if (error) throw error;
      await loadAccounts();
      return true;
    } catch (error) {
      console.error('Error unlinking marketing:', error);
      return false;
    }
  };

  return { accounts, isLoading, loadAccounts, linkMarketing, unlinkMarketing };
}
