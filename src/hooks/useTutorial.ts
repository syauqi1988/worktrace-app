import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TutorialPage = 'dashboard' | 'jobs' | 'customers' | 'quotations' | 'invoices' | 'settings';

interface PageTutorialState {
  completed: boolean;
  seen_count: number;
}

const DEFAULT_PAGE_STATE: PageTutorialState = { completed: false, seen_count: 0 };

export const useTutorial = (page?: TutorialPage) => {
  const { user } = useAuth();
  const [tutorialState, setTutorialState] = useState<Record<string, PageTutorialState>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchTutorialState = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('tutorial_state')
      .eq('id', user.id)
      .single();

    if (data) {
      const state = (data as any).tutorial_state ?? {};
      setTutorialState(state);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTutorialState();
  }, [user, fetchTutorialState]);

  const getPageState = useCallback((p: TutorialPage): PageTutorialState => {
    return tutorialState[p] ?? DEFAULT_PAGE_STATE;
  }, [tutorialState]);

  const markCompleted = useCallback(async (p: TutorialPage) => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('tutorial_state')
      .eq('id', user.id)
      .single();

    const currentState = (data as any)?.tutorial_state ?? {};
    const pageState = currentState[p] ?? DEFAULT_PAGE_STATE;
    const updatedState = {
      ...currentState,
      [p]: {
        completed: true,
        seen_count: pageState.seen_count + 1,
      },
    };

    await supabase
      .from('profiles')
      .update({ tutorial_state: updatedState } as any)
      .eq('id', user.id);

    setTutorialState(updatedState);
  }, [user]);

  const markAllCompleted = useCallback(async () => {
    if (!user) return;
    const allCompleted: Record<string, PageTutorialState> = {};
    const pages: TutorialPage[] = ['dashboard', 'jobs', 'customers', 'quotations', 'invoices', 'settings'];
    for (const p of pages) {
      const existing = tutorialState[p] ?? DEFAULT_PAGE_STATE;
      allCompleted[p] = { completed: true, seen_count: existing.seen_count };
    }

    await supabase
      .from('profiles')
      .update({ tutorial_state: allCompleted } as any)
      .eq('id', user.id);

    setTutorialState(allCompleted);
  }, [user, tutorialState]);

  const incrementSeenCount = useCallback(async (p: TutorialPage) => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('tutorial_state')
      .eq('id', user.id)
      .single();

    const currentState = (data as any)?.tutorial_state ?? {};
    const pageState = currentState[p] ?? DEFAULT_PAGE_STATE;
    const updatedState = {
      ...currentState,
      [p]: {
        ...pageState,
        seen_count: pageState.seen_count + 1,
      },
    };

    await supabase
      .from('profiles')
      .update({ tutorial_state: updatedState } as any)
      .eq('id', user.id);

    setTutorialState(updatedState);
  }, [user]);

  const pageState = page ? getPageState(page) : DEFAULT_PAGE_STATE;
  const shouldAutoStart = !isLoading && page ? !pageState.completed : false;
  const totalSeenCount = Object.values(tutorialState).reduce((sum, s) => sum + s.seen_count, 0);

  return {
    tutorialState,
    isLoading,
    shouldAutoStart,
    seenCount: pageState.seen_count,
    totalSeenCount,
    getPageState,
    markCompleted,
    markAllCompleted,
    incrementSeenCount,
    refetch: fetchTutorialState,
  };
};
