import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useTutorial = () => {
  const { user } = useAuth();
  const [tutorialCompleted, setTutorialCompleted] = useState(true);
  const [seenCount, setSeenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTutorialState = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('tutorial_completed, tutorial_seen_count')
      .eq('id', user.id)
      .single();

    if (data) {
      setTutorialCompleted((data as any).tutorial_completed ?? false);
      setSeenCount((data as any).tutorial_seen_count ?? 0);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTutorialState();
  }, [user, fetchTutorialState]);

  const markTutorialStarted = useCallback(async () => {
    if (!user) return;
    const newCount = seenCount + 1;
    setSeenCount(newCount);
    await supabase
      .from('profiles')
      .update({ tutorial_seen_count: newCount } as any)
      .eq('id', user.id);
  }, [user, seenCount]);

  const markTutorialCompleted = useCallback(async () => {
    if (!user) return;
    setTutorialCompleted(true);
    await supabase
      .from('profiles')
      .update({ tutorial_completed: true, tutorial_seen_count: seenCount + 1 } as any)
      .eq('id', user.id);
  }, [user, seenCount]);

  const markTutorialSkipped = useCallback(async () => {
    if (!user) return;
    setTutorialCompleted(true);
    await supabase
      .from('profiles')
      .update({ tutorial_completed: true, tutorial_seen_count: seenCount + 1 } as any)
      .eq('id', user.id);
  }, [user, seenCount]);

  const shouldAutoStart = !isLoading && !tutorialCompleted;

  return {
    tutorialCompleted,
    seenCount,
    isLoading,
    shouldAutoStart,
    markTutorialStarted,
    markTutorialCompleted,
    markTutorialSkipped,
    refetch: fetchTutorialState,
  };
};
