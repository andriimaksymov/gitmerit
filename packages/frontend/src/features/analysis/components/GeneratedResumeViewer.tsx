import { useEffect, useMemo, useState } from 'react';
import { Document as PdfViewer, Page as PdfViewerPage } from 'react-pdf';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Loader2 } from 'lucide-react';
import '../lib/pdfWorker'; // ensures the pdf.js worker is configured
import '../lib/pdfFonts'; // registers the Carlito (Calibri-compatible) font
import type { ResumeSegment } from '../lib/buildUpdatedResume';

export interface DownloadInfo {
  url: string;
  name: string;
}

interface GeneratedResumeViewerProps {
  segments: ResumeSegment[];
  width: number;
  fileName?: string;
  /** Reports the generated PDF's object URL so the parent can render a download
   *  button in its own header (null while generating or on failure). */
  onDownloadReady?: (info: DownloadInfo | null) => void;
}

// Styles for the generated PDF document (not the surrounding UI). These mirror
// the structure of a typical résumé — a name header, ruled section headings and
// hanging-indent bullets — so the regenerated PDF reads like the original rather
// than a flat wall of text.
const docStyles = StyleSheet.create({
  page: {
    paddingVertical: 44,
    paddingHorizontal: 52,
    fontFamily: 'Carlito',
    fontSize: 10,
    lineHeight: 1.4,
    color: '#1e293b',
  },
  name: {
    fontFamily: 'Carlito',
    fontWeight: 'bold',
    fontSize: 18,
    color: '#0f172a',
    marginBottom: 1,
  },
  heading: {
    fontFamily: 'Carlito',
    fontWeight: 'bold',
    fontSize: 11.5,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 5,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  para: {
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  meta: {
    fontStyle: 'italic',
    color: '#475569',
    marginBottom: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 6,
  },
  bulletDot: {
    width: 12,
  },
  bulletText: {
    flex: 1,
  },
  change: {
    backgroundColor: '#bbf7d0',
    color: '#064e3b',
  },
});

interface Run {
  text: string;
  change?: boolean;
}

// Section headings commonly found in résumés, matched even when not upper-cased.
const SECTION_RE =
  /^(work |professional |employment )?(experience|education|skills|technical skills|projects|certifications|certificates|summary|profile|objective|about|achievements|accomplishments|awards|honors|languages|interests|hobbies|contact|publications|references|volunteering|volunteer experience|leadership|activities)\b/i;
// An inline bullet: a marker glyph followed by its text on the same line.
const BULLET_RE = /^\s*[•·▪◦‣⁃◾▸►●○*·ï-]\s+/;
// Glyphs an extractor may use (or mis-encode) for a bullet — note "ï" is a
// Unicode letter, so it must be listed explicitly rather than caught as a symbol.
const BULLET_GLYPHS = /^[•·▪◦‣⁃◾▸►●○ïÏ]+$/u;
/**
 * A "lone" bullet marker on its own line. Extractors (pdf-parse) frequently emit
 * the bullet glyph and its text as two separate lines — and sometimes mis-encode
 * the glyph (e.g. • → "ï") — so a short line that is only symbols or a known
 * marker is treated as a marker, and the text line that follows becomes its body.
 */
function isLoneBullet(trimmed: string): boolean {
  if (trimmed.length === 0 || trimmed.length > 2) return false;
  return /^[^\p{L}\p{N}\s]+$/u.test(trimmed) || BULLET_GLYPHS.test(trimmed);
}

/** Split the flat segment list into lines of inline runs, preserving changes. */
function toLines(segments: ResumeSegment[]): Run[][] {
  const lines: Run[][] = [];
  let current: Run[] = [];
  for (const seg of segments) {
    const parts = seg.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) {
        lines.push(current);
        current = [];
      }
      if (part.length > 0) current.push({ text: part, change: Boolean(seg.change) });
    });
  }
  lines.push(current);
  return lines;
}

type LineKind = 'name' | 'heading' | 'bullet' | 'para' | 'blank';

function classify(lineText: string, isFirst: boolean): LineKind {
  const trimmed = lineText.trim();
  if (!trimmed) return 'blank';
  if (BULLET_RE.test(trimmed)) return 'bullet';
  if (isFirst) return 'name';
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  const isUpper = letters.length >= 2 && letters === letters.toUpperCase();
  if (trimmed.length <= 50 && (isUpper || SECTION_RE.test(trimmed))) return 'heading';
  return 'para';
}

/** Remove the leading bullet marker so we can render a consistent glyph. */
function stripBullet(runs: Run[]): Run[] {
  if (runs.length === 0) return runs;
  const [first, ...rest] = runs;
  return [{ ...first, text: first.text.replace(BULLET_RE, '') }, ...rest];
}

function renderRuns(runs: Run[]) {
  return runs.map((run, i) =>
    run.change ? (
      <Text key={i} style={docStyles.change}>
        {run.text}
      </Text>
    ) : (
      <Text key={i}>{run.text}</Text>
    )
  );
}

// A "Label: value" line (résumé skill rows like "Frontend Core: React, …").
const LABEL_RE = /^([^:\n]{1,40}:)(.*)$/s;
// A date / location meta line under a job title, e.g. "May 2022 - Present | Remote".
const META_RE = /\b((19|20)\d{2}|present)\b/i;

function isMetaLine(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length <= 60 && META_RE.test(trimmed);
}

/**
 * Render a paragraph, bolding the leading "Label:" prefix the way the original
 * résumé does for skill rows. Only the first run is inspected (the label always
 * leads the line) and change runs are left untouched.
 */
function renderRunsWithLabel(runs: Run[]) {
  const first = runs[0];
  if (first && !first.change) {
    const match = LABEL_RE.exec(first.text);
    if (match) {
      const rest: Run[] = [{ text: match[2] }, ...runs.slice(1)];
      return [
        <Text key="label" style={docStyles.bold}>
          {match[1]}
        </Text>,
        ...renderRuns(rest),
      ];
    }
  }
  return renderRuns(runs);
}

interface Block {
  kind: 'name' | 'heading' | 'para' | 'bullet';
  runs: Run[];
}

/**
 * Group lines into renderable blocks. Wrapped continuation lines — which start
 * with a lowercase letter — are merged back into the paragraph or bullet above
 * them, so body copy flows like the source document instead of breaking at
 * every extracted line. Distinct entries (headings, skill rows, new bullets)
 * begin with a capital or a marker and stay on their own line.
 */
function toBlocks(segments: ResumeSegment[]): Block[] {
  const lines = toLines(segments);
  const blocks: Block[] = [];
  let current: Block | null = null;
  let seenFirst = false;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  let pendingBullet = false;

  for (const runs of lines) {
    const lineText = runs.map((run) => run.text).join('');
    const trimmed = lineText.trim();

    if (trimmed.length === 0) {
      flush();
      continue;
    }
    // A bullet glyph on its own line — the next text line is its body.
    if (isLoneBullet(trimmed)) {
      flush();
      pendingBullet = true;
      continue;
    }

    const isFirst = !seenFirst;
    seenFirst = true;
    const kind = classify(lineText, isFirst);

    if (kind === 'bullet') {
      flush();
      current = { kind: 'bullet', runs: stripBullet(runs) };
      pendingBullet = false;
      continue;
    }
    if (pendingBullet) {
      flush();
      current = { kind: 'bullet', runs };
      pendingBullet = false;
      continue;
    }
    if (kind === 'name' || kind === 'heading') {
      flush();
      blocks.push({ kind, runs });
      continue;
    }
    // Paragraph line: append to the block above when it's a wrapped continuation.
    if (current && /^\s*[a-z]/.test(lineText)) {
      current.runs.push({ text: ' ' }, ...runs);
    } else {
      flush();
      current = { kind: 'para', runs };
    }
  }
  flush();
  return blocks;
}

function buildDocument(segments: ResumeSegment[]) {
  const blocks = toBlocks(segments);
  return (
    <Document title="Updated Resume">
      <Page size="A4" style={docStyles.page} wrap>
        {blocks.map((block, i) => {
          if (block.kind === 'name')
            return (
              <Text key={i} style={docStyles.name}>
                {renderRuns(block.runs)}
              </Text>
            );
          if (block.kind === 'heading')
            return (
              <Text key={i} style={docStyles.heading}>
                {renderRuns(block.runs)}
              </Text>
            );
          if (block.kind === 'bullet')
            return (
              <View key={i} style={docStyles.bulletRow} wrap={false}>
                <Text style={docStyles.bulletDot}>•</Text>
                <Text style={docStyles.bulletText}>{renderRuns(block.runs)}</Text>
              </View>
            );

          // Paragraph — match the original résumé's emphasis: italic date/meta
          // lines, bold job titles (the line directly above a date line), and
          // bold "Label:" prefixes on skill rows.
          const text = block.runs.map((run) => run.text).join('');
          if (isMetaLine(text))
            return (
              <Text key={i} style={docStyles.meta}>
                {renderRuns(block.runs)}
              </Text>
            );
          const next = blocks[i + 1];
          const isTitle = next?.kind === 'para' && isMetaLine(next.runs.map((r) => r.text).join(''));
          if (isTitle)
            return (
              <Text key={i} style={[docStyles.para, docStyles.bold]}>
                {renderRuns(block.runs)}
              </Text>
            );
          return (
            <Text key={i} style={docStyles.para}>
              {renderRunsWithLabel(block.runs)}
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}

const GeneratedResumeViewer = ({
  segments,
  width,
  fileName,
  onDownloadReady,
}: GeneratedResumeViewerProps) => {
  const doc = useMemo(() => buildDocument(segments), [segments]);
  const [url, setUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [failed, setFailed] = useState(false);

  // Render the React-PDF document to a Blob and expose it as an object URL.
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    pdf(doc)
      .toBlob()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setFailed(false);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc]);

  const downloadName = useMemo(() => {
    const base = (fileName ?? 'resume').replace(/\.pdf$/i, '');
    return `${base}-updated.pdf`;
  }, [fileName]);

  // Surface the download link to the parent so its header owns the button.
  useEffect(() => {
    onDownloadReady?.(url ? { url, name: downloadName } : null);
  }, [url, downloadName, onDownloadReady]);
  useEffect(() => () => onDownloadReady?.(null), [onDownloadReady]);

  if (failed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Couldn&apos;t generate the updated PDF. Your changes are still listed above.
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm">Generating updated PDF…</span>
      </div>
    );
  }

  return (
    <div className="max-h-[85vh] overflow-auto rounded-xl bg-slate-50 p-2">
      <PdfViewer
        file={url}
        onLoadSuccess={({ numPages: total }) => setNumPages(total)}
        onLoadError={() => setFailed(true)}
        loading={
          <div className="flex h-64 items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} className="mb-4 flex justify-center">
            <PdfViewerPage
              pageNumber={i + 1}
              width={width}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </div>
        ))}
      </PdfViewer>
    </div>
  );
};

export default GeneratedResumeViewer;
