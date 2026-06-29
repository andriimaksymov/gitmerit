import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Document, Page } from 'react-pdf';
import { Download, FileText, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import '../lib/pdfWorker'; // configures the pdf.js worker as a side effect
import {
  highlightQuotes,
  setActiveHighlight,
  type HighlightImprovement,
} from '../lib/highlightQuotes';
import { buildUpdatedResume, extendQuoteTail } from '../lib/buildUpdatedResume';
import type { DownloadInfo } from './GeneratedResumeViewer';

// @react-pdf/renderer is heavy (~1.5 MB) — load it only when the updated PDF is shown.
const GeneratedResumeViewer = lazy(() => import('./GeneratedResumeViewer'));

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

export interface ReviewImprovement {
  category: string;
  suggestion: string;
  quote: string;
  rewritten: string;
}

interface CvPdfReviewerProps {
  file?: File;
  text: string;
  improvements: ReviewImprovement[];
}

const categoryDot: Record<string, string> = {
  Impact: 'bg-red-500',
  Clarity: 'bg-blue-500',
  Formatting: 'bg-violet-500',
  Skills: 'bg-emerald-500',
};

const MAX_PAGE_WIDTH = 1400;
// Render the pages a touch smaller than their column so both résumés fit
// comfortably side by side without filling every pixel.
const DEFAULT_ZOOM = 0.85;

interface Tooltip {
  index: number;
  top: number;
  left: number;
}

const CvPdfReviewer = ({ file, text, improvements }: CvPdfReviewerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const pdfWrapRef = useRef<HTMLDivElement>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(420);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [docError, setDocError] = useState(false);
  const [download, setDownload] = useState<DownloadInfo | null>(null);

  // Extend each quote to absorb a trailing same-line continuation the AI left
  // out, so the original highlight and the rewrite cover the whole phrase (no
  // dangling leftover word). Shared by both views to keep them consistent.
  const resolvedImprovements = useMemo(
    () => improvements.map((item) => ({ ...item, quote: extendQuoteTail(text, item.quote) })),
    [improvements, text]
  );

  const highlightTargets = useMemo<HighlightImprovement[]>(
    () =>
      resolvedImprovements.map((item, index) => ({
        index,
        quote: item.quote,
        category: item.category,
      })),
    [resolvedImprovements]
  );

  const updated = useMemo(
    () => buildUpdatedResume(text, resolvedImprovements),
    [text, resolvedImprovements]
  );

  // Measure the document area so PDF pages render at the right width.
  useLayoutEffect(() => {
    const node = pdfWrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0)
        setPageWidth(
          Math.max(280, Math.min(MAX_PAGE_WIDTH, Math.floor((width - 16) * DEFAULT_ZOOM)))
        );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [file]);

  // Highlight a PDF page once its text layer has rendered.
  const highlightPage = useCallback(
    (pageNumber: number) => {
      const pageEl = pdfWrapRef.current?.querySelector<HTMLElement>(
        `.react-pdf__Page[data-page-number="${pageNumber}"]`
      );
      const textLayer = pageEl?.querySelector<HTMLElement>(
        '.react-pdf__Page__textContent, .textLayer'
      );
      if (!textLayer) return;
      highlightQuotes(textLayer, highlightTargets);
      if (rootRef.current) setActiveHighlight(rootRef.current, activeIndex);
    },
    [highlightTargets, activeIndex]
  );

  // Text-mode fallback: highlight the plain-text block once.
  useEffect(() => {
    if (file) return;
    const pre = pdfWrapRef.current?.querySelector<HTMLElement>('[data-cv-text]');
    if (pre) highlightQuotes(pre, highlightTargets);
  }, [file, highlightTargets, text]);

  // Reflect the active selection on every rendered mark (original + updated).
  useEffect(() => {
    if (rootRef.current) setActiveHighlight(rootRef.current, activeIndex);
  }, [activeIndex, numPages, updated]);

  const showTooltip = useCallback((index: number, rect: DOMRect) => {
    const top = rect.bottom + 8;
    const left = Math.min(Math.max(12, rect.left), document.documentElement.clientWidth - 332);
    setTooltip({ index, top, left });
  }, []);

  // Clicking any highlight (in the original or the updated résumé).
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const mark = (event.target as HTMLElement).closest<HTMLElement>('[data-cv-highlight]');
      if (!mark) return;
      const index = Number(mark.dataset.cvHighlight);
      setActiveIndex(index);
      showTooltip(index, mark.getBoundingClientRect());
    },
    [showTooltip]
  );

  // Dismiss the tooltip on outside interaction or scroll.
  useEffect(() => {
    if (!tooltip) return;
    const dismiss = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-cv-tooltip]') || target.closest('[data-cv-highlight]')) return;
      setTooltip(null);
    };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('scroll', () => setTooltip(null), { passive: true, once: true });
    return () => window.removeEventListener('pointerdown', dismiss);
  }, [tooltip]);

  const tooltipItem = tooltip != null ? improvements[tooltip.index] : null;

  return (
    <div ref={rootRef} onClick={handleClick}>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Original résumé */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex min-h-[34px] flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <FileText className="h-4 w-4" />
              Your Resume — Original
            </h3>
            <span className="text-xs text-slate-500">
              Highlighted passages are what the AI rewrote · click to see the change
            </span>
          </div>
          <div ref={pdfWrapRef} className="max-h-[85vh] overflow-auto rounded-xl bg-slate-50 p-2">
            {file && !docError ? (
              <Document
                file={file}
                onLoadSuccess={({ numPages: total }) => setNumPages(total)}
                onLoadError={() => setDocError(true)}
                loading={
                  <div className="flex h-64 items-center justify-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} className="mb-4 flex justify-center">
                    <Page
                      pageNumber={i + 1}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      onRenderTextLayerSuccess={() => highlightPage(i + 1)}
                    />
                  </div>
                ))}
              </Document>
            ) : (
              <pre
                data-cv-text
                className="max-h-[80vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-sm leading-7 text-slate-900"
              >
                {text}
              </pre>
            )}
          </div>
        </section>

        {/* Fully updated résumé */}
        <section className="min-w-0 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex min-h-[34px] flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Wand2 className="h-4 w-4 text-emerald-600" />
              Updated Resume — all AI suggestions applied
            </h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {updated.appliedCount} change{updated.appliedCount === 1 ? '' : 's'} applied
              </span>
              {download && (
                <a
                  href={download.url}
                  download={download.name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </a>
              )}
            </div>
          </div>

          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm">Loading PDF generator…</span>
              </div>
            }
          >
            <GeneratedResumeViewer
              segments={updated.segments}
              width={pageWidth}
              fileName={file?.name}
              onDownloadReady={setDownload}
            />
          </Suspense>

          {updated.unmatched.length > 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                <Sparkles className="h-3.5 w-3.5" />
                Couldn&apos;t auto-place these — apply manually
              </p>
              <ul className="mt-3 space-y-3">
                {updated.unmatched.map((item) => (
                  <li key={item.index} className="text-sm">
                    <p className="text-xs font-medium text-orange-600">{item.suggestion}</p>
                    <p className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-slate-900">
                      {item.rewritten}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Change tooltip */}
      {tooltip && tooltipItem && (
        <div
          data-cv-tooltip
          style={{ top: tooltip.top, left: tooltip.left }}
          className="fixed z-50 w-80 max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setTooltip(null)}
            className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span
              className={`h-2.5 w-2.5 rounded-full ${categoryDot[tooltipItem.category] ?? 'bg-slate-400'}`}
            />
            {tooltipItem.category}
          </span>
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-slate-900 line-through decoration-red-300">
            {tooltipItem.quote}
          </p>
          <p className="mt-2 text-xs font-medium text-orange-600">{tooltipItem.suggestion}</p>
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium leading-6 text-slate-900">
            <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>{tooltipItem.rewritten}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvPdfReviewer;
