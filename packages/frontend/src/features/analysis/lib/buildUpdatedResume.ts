/**
 * Produce a "fully updated" résumé by applying every improvement's `rewritten`
 * text in place of its original `quote` within the extracted résumé text.
 *
 * Returns an ordered list of segments — untouched runs interleaved with the
 * applied changes — so the UI can render the new résumé and highlight exactly
 * what was rewritten. Matching is whitespace/case-insensitive so AI quotes line
 * up with the extracted text.
 */

export interface ResumeChange {
  index: number;
  original: string;
  suggestion: string;
}

export interface ResumeSegment {
  text: string;
  change?: ResumeChange;
}

export interface UpdatedResume {
  segments: ResumeSegment[];
  appliedCount: number;
  /** Improvements whose quote couldn't be located in the text. */
  unmatched: { index: number; rewritten: string; suggestion: string }[];
}

export interface ImprovementInput {
  suggestion: string;
  quote: string;
  rewritten: string;
}

function normalize(input: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let prevSpace = true;
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (/\s/.test(c)) {
      if (!prevSpace) {
        norm += ' ';
        map.push(i);
      }
      prevSpace = true;
    } else {
      norm += c.toLowerCase();
      map.push(i);
      prevSpace = false;
    }
  }
  return { norm, map };
}

// The AI sometimes quotes a phrase one or more words short of what its rewrite
// actually replaces — e.g. it quotes "...development" while the résumé reads
// "...development acceleration". The leftover word then dangles: unhighlighted on
// the original and stranded after the rewrite. A short lowercase tail right after
// the matched quote — on the same line, or wrapped onto the immediately following
// line (PDF extraction often breaks a phrase mid-way) — is the unquoted remainder
// of the same phrase, so fold it into the quote. A lowercase start is the signal:
// real new entries/sentences begin with a capital, a bullet, or a digit.
const ORPHAN_TAIL_RE = /^[ \t]*\n?[ \t]*[a-z][\w'-]*(?:[ \t]+[a-z][\w'-]*){0,3}[ \t]*(?=\n|$)/;

/**
 * Return `quote` extended to include a trailing same-line continuation, or the
 * original quote when there is none / the quote isn't found. The result is an
 * exact substring of `text`, so downstream exact and normalized matching holds.
 */
export function extendQuoteTail(text: string, quote: string): string {
  const { norm, map } = normalize(text);
  const { norm: needle } = normalize(quote);
  if (needle.length < 3) return quote;
  const pos = norm.indexOf(needle);
  if (pos === -1) return quote;
  const rawStart = map[pos];
  const rawEnd = map[pos + needle.length - 1] + 1;
  const tail = ORPHAN_TAIL_RE.exec(text.slice(rawEnd));
  if (!tail) return quote;
  return text.slice(rawStart, rawEnd + tail[0].length);
}

interface Match {
  rawStart: number;
  rawEnd: number;
  index: number;
  rewritten: string;
  suggestion: string;
  original: string;
}

export function buildUpdatedResume(text: string, improvements: ImprovementInput[]): UpdatedResume {
  const { norm, map } = normalize(text);
  const matches: Match[] = [];
  const unmatched: UpdatedResume['unmatched'] = [];

  improvements.forEach((improvement, index) => {
    const { norm: needle } = normalize(improvement.quote);
    const pos = needle.length >= 3 ? norm.indexOf(needle) : -1;
    if (pos === -1) {
      unmatched.push({
        index,
        rewritten: improvement.rewritten,
        suggestion: improvement.suggestion,
      });
      return;
    }
    const rawStart = map[pos];
    const rawEnd = map[pos + needle.length - 1] + 1;
    matches.push({
      rawStart,
      rawEnd,
      index,
      rewritten: improvement.rewritten,
      suggestion: improvement.suggestion,
      original: text.slice(rawStart, rawEnd),
    });
  });

  // Apply changes left-to-right, dropping any that overlap an earlier one.
  matches.sort((a, b) => a.rawStart - b.rawStart);
  const segments: ResumeSegment[] = [];
  let cursor = 0;
  let appliedCount = 0;
  for (const match of matches) {
    if (match.rawStart < cursor) {
      unmatched.push({
        index: match.index,
        rewritten: match.rewritten,
        suggestion: match.suggestion,
      });
      continue;
    }
    if (match.rawStart > cursor) segments.push({ text: text.slice(cursor, match.rawStart) });
    segments.push({
      text: match.rewritten,
      change: { index: match.index, original: match.original, suggestion: match.suggestion },
    });
    cursor = match.rawEnd;
    appliedCount += 1;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return { segments, appliedCount, unmatched };
}
