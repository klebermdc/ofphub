import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'manager' | 'salesperson';

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
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // No role found - default to manager for first user
        console.log('No role found for user, checking if first user');
        setRole(null);
      } else if (data) {
        setRole(data.role as AppRole);
        setSalespersonName(data.salesperson_name);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // Assign manager role to current user
  const assignManagerRole = async () => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'manager'
        });

      if (error) throw error;
      
      setRole('manager');
      return true;
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
      // First check if user already has a role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', salespersonUserId)
        .single();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ salesperson_name: salespersonName })
          .eq('user_id', salespersonUserId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: salespersonUserId,
            role: 'salesperson',
            salesperson_name: salespersonName
          });

        if (error) throw error;
      }

      await loadAccounts();
      return true;
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
