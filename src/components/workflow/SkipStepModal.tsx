import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { SKIP_REASON_OPTIONS } from '@/lib/workflowRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Human-readable step being skipped, e.g. "Work Order" */
  stepLabel: string;
  /** Message from the gate (e.g. why skipping is risky). */
  message: string;
  /** Called with the chosen reason text when user confirms skip. */
  onConfirm: (reason: string) => void;
  /** Optional CTA label that takes user to create the prerequisite first. */
  onBack?: () => void;
  backLabel?: string;
}

export function SkipStepModal({ open, onClose, stepLabel, message, onConfirm, onBack, backLabel }: Props) {
  const [choice, setChoice] = useState<string>('small_or_repeat');
  const [otherText, setOtherText] = useState('');

  const handleConfirm = () => {
    const opt = SKIP_REASON_OPTIONS.find((o) => o.value === choice);
    const reason = choice === 'other' ? (otherText.trim() || 'Lain-lain') : (opt?.labelMs ?? choice);
    onConfirm(reason);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Skip {stepLabel}?
          </DialogTitle>
        </DialogHeader>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">Select reason:</p>
          {SKIP_REASON_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="skip-reason"
                value={opt.value}
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
                className="accent-primary"
              />
              {opt.labelMs}
            </label>
          ))}
          {choice === 'other' && (
            <Input
              autoFocus
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Your reason…"
              className="mt-1"
            />
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3">
          {onBack && (
            <Button variant="default" onClick={onBack}>
              {backLabel ?? `Go Back — Generate ${stepLabel} First`}
            </Button>
          )}
          <Button variant="outline" onClick={handleConfirm}>
            Continue Without {stepLabel} →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Append a skip entry to a jobs.skip_log jsonb array. */
export interface SkipLogEntry {
  step: string;
  reason: string;
  skipped_at: string;
}
export function appendSkipEntry(existing: any, step: string, reason: string): SkipLogEntry[] {
  const arr: SkipLogEntry[] = Array.isArray(existing) ? existing : [];
  return [...arr, { step, reason, skipped_at: new Date().toISOString() }];
}
