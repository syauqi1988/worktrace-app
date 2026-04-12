import { useEffect, useMemo, useState } from 'react';
import { Document as PreviewDocument, Page, pdfjs } from 'react-pdf';
import { Loader2, MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PDFPreviewModalProps {
  open: boolean;
  title: string;
  loading: boolean;
  file: Uint8Array | null;
  onClose: () => void;
  onDownload: () => void;
  onShare?: () => void;
}

export default function PDFPreviewModal({
  open,
  title,
  loading,
  file,
  onClose,
  onDownload,
  onShare,
}: PDFPreviewModalProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(720);
  const [renderError, setRenderError] = useState<string | null>(null);

  const documentFile = useMemo(() => (file ? { data: file } : null), [file]);

  useEffect(() => {
    if (!open) {
      setNumPages(0);
      setRenderError(null);
      return;
    }

    const updatePageWidth = () => {
      const viewportWidth = window.innerWidth;
      const nextWidth = viewportWidth < 768
        ? Math.max(260, viewportWidth - 32)
        : Math.max(320, Math.min(760, viewportWidth - 360));

      setPageWidth(nextWidth);
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);

    return () => window.removeEventListener('resize', updatePageWidth);
  }, [open]);

  useEffect(() => {
    if (!file) {
      setNumPages(0);
      setRenderError(null);
    }
  }, [file]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/80" />

      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-background md:h-[min(90vh,1000px)] md:w-[min(90vw,860px)] md:rounded-xl md:border md:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 shrink-0">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onDownload} className="h-8 text-xs">
              Muat Turun
            </Button>

            {onShare ? (
              <Button size="sm" onClick={onShare} className="h-8 text-xs text-white" style={{ backgroundColor: '#25D366' }}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
              </Button>
            ) : null}

            <button type="button" onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-muted/40 p-4 md:p-6">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Menjana pratonton...</span>
            </div>
          ) : documentFile ? (
            <PreviewDocument
              file={documentFile}
              loading={
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Memuatkan halaman PDF...</span>
                </div>
              }
              onLoadSuccess={({ numPages: totalPages }) => {
                setNumPages(totalPages);
                setRenderError(null);
              }}
              onLoadError={() => {
                setNumPages(0);
                setRenderError('Gagal memaparkan pratonton PDF. Sila cuba semula.');
              }}
            >
              <div className="mx-auto flex w-full max-w-fit flex-col gap-4">
                {Array.from({ length: numPages }, (_, index) => (
                  <Page
                    key={index + 1}
                    className="overflow-hidden rounded-lg border border-border bg-background shadow-sm"
                    pageNumber={index + 1}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    width={pageWidth}
                  />
                ))}
              </div>
            </PreviewDocument>
          ) : null}

          {renderError ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-destructive">
              {renderError}
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-background px-4 py-2 text-center shrink-0">
          <span className="text-xs text-muted-foreground">
            {numPages > 0 ? `Jumlah halaman: ${numPages}` : 'Pratonton PDF'}
          </span>
        </div>
      </div>
    </div>
  );
}