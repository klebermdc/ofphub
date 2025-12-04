import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSheetSettings(userId: string | undefined) {
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved URL on mount - first try user's own, then any available
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadSavedUrl = async () => {
      try {
        // First, try to get the current user's saved URL
        const { data: userSettings, error: userError } = await supabase
          .from('user_sheet_settings')
          .select('sheet_url')
          .eq('user_id', userId)
          .maybeSingle();

        if (userError) {
          console.error('Error loading user sheet settings:', userError);
        }

        if (userSettings?.sheet_url) {
          setSavedUrl(userSettings.sheet_url);
        } else {
          // If user doesn't have their own URL, get any available URL (shared data source)
          const { data: anySettings, error: anyError } = await supabase
            .from('user_sheet_settings')
            .select('sheet_url')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (anyError) {
            console.error('Error loading shared sheet settings:', anyError);
          } else if (anySettings?.sheet_url) {
            setSavedUrl(anySettings.sheet_url);
          }
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
