import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { driver, type Driver } from 'driver.js';
import { useTutorial, type TutorialPage } from '@/hooks/useTutorial';
import WelcomeModal from './WelcomeModal';
import { buildPageTutorialSteps } from './tutorialSteps';

declare global {
  interface Window {
    __startWorkTraceTutorial?: () => void;
  }
}

function getCurrentPage(pathname: string): TutorialPage {
  // Detail pages first (more specific)
  if (/^\/jobs\/[^/]+/.test(pathname)) return 'job-detail';
  if (/^\/quotations\/[^/]+/.test(pathname)) return 'quotation-detail';
  if (/^\/invoices\/[^/]+/.test(pathname)) return 'invoice-detail';
  // List pages
  if (pathname.startsWith('/jobs')) return 'jobs';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/quotations')) return 'quotations';
  if (pathname.startsWith('/work-orders')) return 'work-orders';
  if (pathname.startsWith('/invoices')) return 'invoices';
  if (pathname.startsWith('/receipts')) return 'receipts';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/settings') || pathname.startsWith('/profile')) return 'settings';
  return 'dashboard';
}

interface TutorialControllerProps {
  showWelcome?: boolean;
  onComplete?: () => void;
}

export default function TutorialController({
  showWelcome: showWelcomeProp = false,
  onComplete,
}: TutorialControllerProps) {
  const [showWelcome, setShowWelcome] = useState(false);
  const { pathname } = useLocation();
  const currentPage = getCurrentPage(pathname);
  const {
    isLoading,
    getPageState,
    markCompleted,
    markAllCompleted,
    incrementSeenCount,
  } = useTutorial(currentPage);
  const driverRef = useRef<Driver | null>(null);
  const autoStartedPages = useRef<Set<string>>(new Set());

  // Show welcome modal for new users
  useEffect(() => {
    if (showWelcomeProp) {
      const timer = setTimeout(() => setShowWelcome(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeProp]);

  const startTourForPage = useCallback((page: TutorialPage) => {
    // Destroy any existing tour
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    const steps = buildPageTutorialSteps(page);
    if (steps.length === 0) return;

    incrementSeenCount(page);

    const driverObj = driver({
      showProgress: true,
      progressText: 'Langkah {{current}} daripada {{total}}',
      nextBtnText: 'Seterusnya →',
      prevBtnText: '← Sebelum',
      doneBtnText: 'Selesai! 🎉',
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'worktrace-tutorial-popover',
      onDestroyStarted: () => {
        markCompleted(page);
        onComplete?.();
        driverObj.destroy();
      },
      steps,
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [markCompleted, incrementSeenCount, onComplete]);

  // Auto-start per-page tutorial on first visit (skip detail pages — too noisy)
  const isDetailPage = currentPage === 'job-detail' || currentPage === 'quotation-detail' || currentPage === 'invoice-detail';
  useEffect(() => {
    if (isLoading) return;
    if (isDetailPage) return;
    const pageState = getPageState(currentPage);
    if (!pageState.completed && !autoStartedPages.current.has(currentPage)) {
      autoStartedPages.current.add(currentPage);
      const timer = setTimeout(() => {
        startTourForPage(currentPage);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentPage, getPageState, startTourForPage, isDetailPage]);

  // Expose globally for ? button — always plays the CURRENT page tutorial only
  useEffect(() => {
    window.__startWorkTraceTutorial = () => {
      startTourForPage(currentPage);
    };
    return () => {
      delete window.__startWorkTraceTutorial;
    };
  }, [startTourForPage, currentPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, []);

  const handleStart = useCallback(() => {
    setShowWelcome(false);
    startTourForPage('dashboard');
  }, [startTourForPage]);

  const handleSkip = useCallback(() => {
    setShowWelcome(false);
    markAllCompleted();
  }, [markAllCompleted]);

  return (
    <WelcomeModal
      isOpen={showWelcome}
      onStart={handleStart}
      onSkip={handleSkip}
    />
  );
}
