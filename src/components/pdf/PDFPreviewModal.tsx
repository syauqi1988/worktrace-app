import { useEffect, useMemo, useState } from 'react';
import { Document as PreviewDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

// Use the CDN worker that matches react-pdf's bundled pdfjs version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFPreviewModalProps {
  open: boolean;
  title: string;
  loading: boolean;
  /** Blob URL (from URL.createObjectURL) pointing to the generated PDF */
  fileUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
  onShare?: () => void;
}

export default function PDFPreviewModal({
  open,
  title,
  loading,
  fileUrl,
  onClose,
  onDownload,
  onShare,
}: PDFPreviewModalProps) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(720);
  const [renderError, setRenderError] = useState<string | null>(null);

  // react-pdf needs a stable file reference object
  const documentFile = useMemo(() => (fileUrl ? { url: fileUrl } : null), [fileUrl]);

  useEffect(() => {
    if (!open) {
      setNumPages(0);
      setRenderError(null);
      return;
    }

    const updatePageWidth = () => {
      const vw = window.innerWidth;
      setPageWidth(vw < 768 ? Math.max(260, vw - 32) : Math.max(320, Math.min(760, vw - 360)));
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, [open]);

  useEffect(() => {
    if (!fileUrl) {
      setNumPages(0);
      setRenderError(null);
    }
  }, [fileUrl]);

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
              {t('common.download')}
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
              <span className="text-sm text-muted-foreground">{t('pdfPreview.generating')}</span>
            </div>
          ) : documentFile ? (
            <PreviewDocument
              file={documentFile}
              loading={
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{t('pdfPreview.loadingPages')}</span>
                </div>
              }
              error={
                <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-destructive">
                  {t('pdfPreview.previewFailed')}
                </div>
              }
              onLoadSuccess={({ numPages: totalPages }) => {
                setNumPages(totalPages);
                setRenderError(null);
              }}
              onLoadError={(err) => {
                console.error('PDF load error:', err);
                setNumPages(0);
                setRenderError(t('pdfPreview.renderError'));
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
            {numPages > 0 ? t('pdfPreview.totalPages', { count: numPages }) : t('pdfPreview.title')}
          </span>
        </div>
      </div>
    </div>
  );
}
