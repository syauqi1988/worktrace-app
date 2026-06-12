import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  confirmVariant = 'primary',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const variantClass =
    confirmVariant === 'danger'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : confirmVariant === 'warning'
      ? 'bg-amber-500 text-white hover:bg-amber-600'
      : '';

  return (
    <AlertDialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-[400px] rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>Batal</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isLoading} className={variantClass}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
