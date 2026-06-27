/**
 * Canonical, framework-agnostic analysis contracts shared by the frontend and
 * backend. These were previously hand-redeclared in three places (Zod schema,
 * backend interfaces, frontend types). This package is the single source of
 * truth for the cross-cutting primitives; the backend keeps Zod schemas for
 * runtime validation and a compile-time guard that they stay in sync.
 *
 * Types only — there is no runtime code, so consumers must `import type`.
 */

export type AnalysisSource = 'github' | 'linkedin' | 'cv';

export type ProviderName = 'openai' | 'gemini' | 'groq' | 'deterministic';

export type QualitySignalStatus = 'strong' | 'ok' | 'weak' | 'unknown';

export type ActionPriority = 'high' | 'medium' | 'low';

export type ActionEffort = 'short' | 'medium' | 'long';

export interface AnalysisMetadata {
  source: AnalysisSource;
  provider: ProviderName;
  model: string;
  schemaVersion: string;
  confidence: number;
  warnings: string[];
  generatedAt: string;
}

export interface EvidenceCard {
  id: string;
  source: AnalysisSource;
  title: string;
  summary: string;
  repoName: string | null;
  url: string | null;
  technologies: string[];
  signals: string[];
  gaps: string[];
  nextActions: string[];
}

export interface QualitySignal {
  name: string;
  status: QualitySignalStatus;
  evidence: string;
  score: number | null;
}

export interface NextAction {
  title: string;
  detail: string;
  priority: ActionPriority;
  metricTag: string;
  effort: ActionEffort;
  evidenceIds: string[];
}

/** GitHub scoring breakdown shared between the scoring output and the report. */
export interface AnalysisScores {
  overall: number;
  activity: number;
  projectQuality: number;
  techStackDiversity: number;
  consistency: number;
}
