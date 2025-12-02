import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSheetSettings(userId: string | undefined) {
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved URL on mount
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadSavedUrl = async () => {
      try {
        const { data, error } = await supabase
          .from('user_sheet_settings')
          .select('sheet_url')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error loading sheet settings:', error);
        } else if (data) {
          setSavedUrl(data.sheet_url);
        }
      } catch (err) {
        console.error('Error loading sheet settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedUrl();
  }, [userId]);

  // Save URL to database
  const saveUrl = async (url: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('user_sheet_settings')
        .upsert(
          { user_id: userId, sheet_url: url },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error saving sheet URL:', error);
        return false;
      }

      setSavedUrl(url);
      return true;
    } catch (err) {
      console.error('Error saving sheet URL:', err);
      return false;
    }
  };

  return { savedUrl, isLoading, saveUrl };
}
