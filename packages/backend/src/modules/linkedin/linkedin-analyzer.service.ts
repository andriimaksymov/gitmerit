import { Injectable, Logger } from '@nestjs/common';
import type {
  LinkedinProfileAssessment,
  LinkedinSectionAnalysis,
  LinkedinSectionResult,
} from '@gitmerit/shared';
import { AiProviderClient } from '../ai/providers/ai-provider.client';
import { SECTIONS, SectionDef } from './sections.config';
import { sectionAnalysisSchema } from './schemas/section-analysis.schema';
import { buildSectionPrompt } from './prompts/section-analysis.prompt';
import { parseLinkedinProfile } from './linkedin-pdf.parser';

@Injectable()
export class LinkedinAnalyzer {
  private readonly logger = new Logger(LinkedinAnalyzer.name);

  constructor(private readonly providerClient: AiProviderClient) {}

  /**
   * Parse the PDF into real sections, then fan out one AI call per *present*
   * section (in parallel), each grounded in that section's own content and
   * anchored on the member's headline. Absent sections get a deterministic
   * "missing" result without spending an AI call.
   */
  async assess(profileText: string): Promise<LinkedinProfileAssessment> {
    const parsed = parseLinkedinProfile(profileText);
    const targetTitle = parsed.headline;
    const lowerFull = profileText.toLowerCase();

    // Cap concurrency: one upload can fan out to ~9 provider calls, so an
    // unbounded Promise.all multiplies cost and rate-limit pressure.
    const sections = await this.mapWithConcurrency(SECTIONS, 3, (def) =>
      this.analyzeSection(def, parsed.sections, targetTitle, lowerFull),
    );

    const overallScore = this.weightedOverall(sections);
    this.logger.log(
      `Assessed "${parsed.name}" (${targetTitle}): ${
        sections.filter((s) => s.present).length
      }/${sections.length} sections present, overall ${overallScore}.`,
    );

    return {
      name: parsed.name,
      targetTitle,
      overallScore,
      summary: this.buildSummary(sections, targetTitle, overallScore),
      sections,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Order-preserving concurrent map with a fixed worker-pool size. */
  private async mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      async () => {
        while (nextIndex < items.length) {
          const index = nextIndex++;
          results[index] = await fn(items[index]);
        }
      },
    );
    await Promise.all(workers);
    return results;
  }

  private async analyzeSection(
    def: SectionDef,
    parsedSections: Record<string, string>,
    targetTitle: string,
    lowerFull: string,
  ): Promise<LinkedinSectionResult> {
    const content = def.sourceKeys
      .map((key) => parsedSections[key] ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const present =
      content.length > 0 || (def.detectInFullText?.test(lowerFull) ?? false);

    // Absent sections don't need an AI call — they can only be "add this".
    if (!present) {
      return {
        key: def.key,
        label: def.label,
        present: false,
        ...this.missing(def),
      };
    }

    const { systemPrompt, userPrompt } = buildSectionPrompt(
      def,
      content || `${def.label} signal detected in the profile.`,
      targetTitle,
    );

    const result = await this.providerClient.runStructuredTask({
      source: 'linkedin',
      schemaName: 'linkedin_section',
      schema: sectionAnalysisSchema,
      systemPrompt,
      userPrompt,
    });

    const analysis: LinkedinSectionAnalysis =
      result?.data ?? this.contentFallback(def, content);

    return { key: def.key, label: def.label, present: true, ...analysis };
  }

  /** A section that isn't in the profile scores 0. */
  private missing(def: SectionDef): LinkedinSectionAnalysis {
    return {
      score: 0,
      status: 'missing',
      currentState: `No ${def.label} section was found in your profile export.`,
      recommendation: def.tip,
      actions: def.actions,
    };
  }

  /**
   * Deterministic result for a present section when no AI provider is
   * configured. Scores the section by measurable content signals (so scores
   * vary and reflect quality) and shows a snippet of the real content.
   */
  private contentFallback(
    def: SectionDef,
    content: string,
  ): LinkedinSectionAnalysis {
    const score = this.heuristicScore(def.kind, content);
    const status = this.deriveStatus(score);
    const normalized = content.replace(/\s+/g, ' ').trim();
    const snippet = normalized.slice(0, 220);

    // The static "add this" advice only fits sections that need building.
    // A strong section already has it — affirm instead of telling them to add
    // what they already have.
    const isStrong = status === 'strong';

    return {
      score,
      status,
      currentState: snippet
        ? snippet.length < normalized.length
          ? `${snippet}…`
          : snippet
        : `${def.label} signal detected in your profile.`,
      recommendation: isStrong
        ? `Your ${def.label} is already strong — keep it current and tailored to your target role.`
        : def.tip,
      actions: isStrong ? [] : def.actions,
    };
  }

  /**
   * Heuristic 0–100 score from content signals, shaped per section kind.
   * Capped below 90 — a deterministic heuristic shouldn't claim "excellent".
   */
  private heuristicScore(kind: SectionDef['kind'], content: string): number {
    const text = content.replace(/\s+/g, ' ').trim();
    if (kind === 'signal') return text ? 70 : 60;
    if (!text) return 0;

    if (kind === 'contact') {
      let score = 25;
      if (/@/.test(text)) score += 30; // email
      if (/https?:|www\.|github\.com|\/in\//.test(text)) score += 30; // link
      return Math.min(score, 85);
    }

    if (kind === 'list') {
      const items = text.split(/[\n,;•|]/).filter((x) => x.trim()).length;
      return Math.round(Math.min(20 + items * 14, 85)); // ~5 items → strong
    }

    // prose: reward substance and quantified achievements
    const words = text.split(' ').length;
    let score = 20 + Math.min(words / 80, 1) * 50; // ~80 words → full substance
    if (/\d/.test(text)) score += 12; // metrics / dates
    return Math.round(Math.min(score, 88));
  }

  private deriveStatus(score: number): LinkedinSectionAnalysis['status'] {
    if (score <= 0) return 'missing';
    if (score >= 70) return 'strong';
    if (score >= 45) return 'ok';
    return 'weak';
  }

  private weightedOverall(sections: LinkedinSectionResult[]): number {
    const totalWeight = SECTIONS.reduce((sum, s) => sum + s.weight, 0);
    const weighted = sections.reduce((sum, section) => {
      const def = SECTIONS.find((s) => s.key === section.key);
      return sum + section.score * (def?.weight ?? 1);
    }, 0);
    return Math.round(weighted / totalWeight);
  }

  private buildSummary(
    sections: LinkedinSectionResult[],
    targetTitle: string,
    overallScore: number,
  ): string {
    const sorted = [...sections].sort((a, b) => b.score - a.score);
    const strongest = sorted[0]?.label ?? 'your profile';
    const weakest = sorted
      .filter((s) => s.status === 'weak' || s.status === 'missing')
      .slice(0, 2)
      .map((s) => s.label);

    const focus = weakest.length
      ? `Focus next on ${weakest.join(' and ')}.`
      : 'Your sections are broadly in good shape.';

    const role =
      targetTitle === 'your target role'
        ? 'your target role'
        : `a ${targetTitle}`;

    return `Your profile scores ${overallScore}/100 for ${role}. Strongest area: ${strongest}. ${focus}`;
  }
}
