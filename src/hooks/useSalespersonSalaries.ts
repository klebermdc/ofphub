import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SALESPERSON_SALARIES } from '@/config/salaries';

interface SalaryEntry {
  id?: string;
  salesperson_name: string;
  salary: number;
}

export function useSalespersonSalaries(userId: string | undefined) {
  const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSalaries = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('salesperson_salaries')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        setSalaries(data.map(d => ({
          id: d.id,
          salesperson_name: d.salesperson_name,
          salary: Number(d.salary)
        })));
      } else {
        // Initialize with default salaries from config
        const defaultSalaries = Object.entries(SALESPERSON_SALARIES).map(([name, salary]) => ({
          salesperson_name: name,
          salary
        }));
        setSalaries(defaultSalaries);
      }
    } catch (error) {
      console.error('Error loading salaries:', error);
      // Fall back to default salaries
      const defaultSalaries = Object.entries(SALESPERSON_SALARIES).map(([name, salary]) => ({
        salesperson_name: name,
        salary
      }));
      setSalaries(defaultSalaries);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSalaries();
  }, [loadSalaries]);

  const saveSalaries = async (entries: SalaryEntry[]) => {
    if (!userId) return false;

    try {
      // Delete existing entries
      await supabase
        .from('salesperson_salaries')
        .delete()
        .eq('user_id', userId);

      // Insert new entries
      const { error } = await supabase
        .from('salesperson_salaries')
        .insert(entries.map(e => ({
          user_id: userId,
          salesperson_name: e.salesperson_name,
          salary: e.salary
        })));

      if (error) throw error;

      await loadSalaries();
      return true;
    } catch (error) {
      console.error('Error saving salaries:', error);
      return false;
    }
  };

  const getSalary = useCallback((name: string): number => {
    const normalizedName = name.trim().toLowerCase();
    
    for (const entry of salaries) {
      if (normalizedName.includes(entry.salesperson_name.toLowerCase()) || 
          entry.salesperson_name.toLowerCase().includes(normalizedName)) {
        return entry.salary;
      }
    }
    
    // Fall back to config
    for (const [salesperson, salary] of Object.entries(SALESPERSON_SALARIES)) {
      if (normalizedName.includes(salesperson.toLowerCase()) || 
          salesperson.toLowerCase().includes(normalizedName)) {
        return salary;
      }
    }
    
    return 0;
  }, [salaries]);

  return { salaries, isLoading, saveSalaries, getSalary, loadSalaries };
}
