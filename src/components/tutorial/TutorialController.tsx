import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import { useTutorial } from '@/hooks/useTutorial';
import WelcomeModal from './WelcomeModal';
import { buildTutorialSteps } from './tutorialSteps';

declare global {
  interface Window {
    __startWorkTraceTutorial?: () => void;
  }
}

interface TutorialControllerProps {
  autoStart?: boolean;
  onComplete?: () => void;
}

export default function TutorialController({
  autoStart = false,
  onComplete,
}: TutorialControllerProps) {
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const {
    markTutorialStarted,
    markTutorialCompleted,
    markTutorialSkipped,
  } = useTutorial();

  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => setShowWelcome(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    markTutorialStarted();

    // Navigate to dashboard first so sidebar + dashboard elements are visible
    navigate('/dashboard');

    setTimeout(() => {
      const steps = buildTutorialSteps(navigate);
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
          markTutorialCompleted();
          onComplete?.();
          driverObj.destroy();
        },
        steps,
        onNextClick: () => {
          const activeIndex = driverObj.getActiveIndex();
          if (activeIndex === undefined || activeIndex === null) return;
          const step = steps[activeIndex];
          if (step?.popover && 'onNextClick' in step.popover && typeof step.popover.onNextClick === 'function') {
            (step.popover.onNextClick as () => void)();
            // Wait for SPA navigation to render
            setTimeout(() => {
              driverObj.moveNext();
            }, 500);
          } else {
            driverObj.moveNext();
          }
        },
      });

      driverObj.drive();
    }, 300);
  }, [navigate, markTutorialStarted, markTutorialCompleted, onComplete]);

  const handleSkip = useCallback(() => {
    setShowWelcome(false);
    markTutorialSkipped();
  }, [markTutorialSkipped]);

  // Expose globally for Settings replay and header ? button
  useEffect(() => {
    window.__startWorkTraceTutorial = startTour;
    return () => {
      delete window.__startWorkTraceTutorial;
    };
  }, [startTour]);

  return (
    <WelcomeModal
      isOpen={showWelcome}
      onStart={startTour}
      onSkip={handleSkip}
    />
  );
}
