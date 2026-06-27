import { z } from 'zod/v3';
import type * as Shared from '@portfolio/shared';

export const analysisSourceSchema = z.enum(['github', 'linkedin', 'cv']);
export const providerNameSchema = z.enum([
  'openai',
  'gemini',
  'groq',
  'deterministic',
]);

export const analysisMetadataSchema = z.object({
  source: analysisSourceSchema,
  provider: providerNameSchema,
  model: z.string(),
  schemaVersion: z.string(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  generatedAt: z.string(),
});

export const qualitySignalSchema = z.object({
  name: z.string(),
  status: z.enum(['strong', 'ok', 'weak', 'unknown']),
  evidence: z.string(),
  score: z.number().min(0).max(100).nullable(),
});

export const nextActionSchema = z.object({
  title: z.string(),
  detail: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  metricTag: z.string(),
  effort: z.enum(['short', 'medium', 'long']),
  evidenceIds: z.array(z.string()),
});

export const evidenceCardSchema = z.object({
  id: z.string(),
  source: analysisSourceSchema,
  title: z.string(),
  summary: z.string(),
  repoName: z.string().nullable(),
  url: z.string().nullable(),
  technologies: z.array(z.string()),
  signals: z.array(z.string()),
  gaps: z.array(z.string()),
  nextActions: z.array(z.string()),
});

const githubFlagshipProjectSchema = z.object({
  name: z.string(),
  reason: z.string(),
  url: z.string(),
  stars: z.number(),
  technologies: z.array(z.string()),
  improvements: z.array(z.string()),
  evidenceIds: z.array(z.string()),
});

const metricInsightsSchema = z.object({
  activity: z.string(),
  quality: z.string(),
  stack: z.string(),
  consistency: z.string(),
});

const overviewSchema = z.object({
  current: z.string(),
  working: z.string(),
  fixFirst: z.string(),
});

const checklistItemSchema = z.object({
  item: z.string(),
  metricTag: z.string(),
  evidenceIds: z.array(z.string()),
});

export const githubAiResponseSchema = z.object({
  summary: z.string(),
  careerPath: z.string(),
  keyStrengths: z.array(z.string()),
  improvements: z.array(z.string()),
  overview: overviewSchema,
  profileSummary: z.string(),
  flagshipProjects: z.array(githubFlagshipProjectSchema),
  metricInsights: metricInsightsSchema,
  checklist: z.array(checklistItemSchema),
  sourceLimitations: z.array(z.string()),
  nextActions: z.array(nextActionSchema),
  evidenceReferences: z.array(z.string()),
});

export const linkedinDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.string(),
  insights: z.array(z.string()),
});

export const linkedinAiResponseSchema = z.object({
  summary: z.object({
    text: z.string(),
    seniorityGuess: z.string(),
  }),
  dimensions: z.object({
    profile: linkedinDimensionSchema,
    headline: linkedinDimensionSchema,
    experience: linkedinDimensionSchema,
    skills: linkedinDimensionSchema,
    branding: linkedinDimensionSchema,
    overall: z.number().min(0).max(100),
  }),
  recommendations: z.object({
    headlines: z.array(z.string()),
    aboutSuggestions: z.object({
      missing: z.string(),
      rewritten: z.string(),
    }),
    experienceEdits: z.array(
      z.object({
        role: z.string(),
        company: z.string(),
        improvements: z.array(z.string()),
      }),
    ),
  }),
  missingKeywords: z.array(z.string()),
  actionPlan: z.object({
    thisWeek: z.array(z.string()),
    next30Days: z.array(z.string()),
    next60Days: z.array(z.string()),
  }),
  sourceLimitations: z.array(z.string()),
  nextActions: z.array(nextActionSchema),
});

export const cvImprovementCategorySchema = z.enum([
  'Impact',
  'Clarity',
  'Formatting',
  'Skills',
]);

export const cvAiResponseSchema = z.object({
  summary: z.object({
    professionalLikelihood: z.number().min(0).max(100),
    critique: z.string(),
  }),
  improvements: z.array(
    z.object({
      category: cvImprovementCategorySchema,
      quote: z.string(),
      suggestion: z.string(),
      rewritten: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
  missingKeywords: z.array(z.string()),
  sourceLimitations: z.array(z.string()),
  nextActions: z.array(nextActionSchema),
});

// Cross-cutting primitives now live in the shared package (single source of
// truth for frontend + backend). Re-exported here so existing imports from
// this module keep working.
export type {
  AnalysisSource,
  ProviderName,
  AnalysisMetadata,
  QualitySignal,
  NextAction,
  EvidenceCard,
} from '@portfolio/shared';

// Response shapes remain backend-owned (inferred from the Zod schemas).
export type GithubAiResponse = z.infer<typeof githubAiResponseSchema>;
export type LinkedinAiResponse = z.infer<typeof linkedinAiResponseSchema>;
export type LinkedinDimension = z.infer<typeof linkedinDimensionSchema>;
export type CvAiResponse = z.infer<typeof cvAiResponseSchema>;
export type CvImprovementCategory = z.infer<typeof cvImprovementCategorySchema>;

// Compile-time guard: the Zod schemas above must stay structurally identical to
// the shared TypeScript contracts. If a schema drifts, assigning `true` to a
// `never` tuple slot below stops compiling — a deliberate tripwire.
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const SCHEMA_CONFORMS_WITH_SHARED: [
  Equals<z.infer<typeof analysisSourceSchema>, Shared.AnalysisSource>,
  Equals<z.infer<typeof providerNameSchema>, Shared.ProviderName>,
  Equals<z.infer<typeof analysisMetadataSchema>, Shared.AnalysisMetadata>,
  Equals<z.infer<typeof qualitySignalSchema>, Shared.QualitySignal>,
  Equals<z.infer<typeof nextActionSchema>, Shared.NextAction>,
  Equals<z.infer<typeof evidenceCardSchema>, Shared.EvidenceCard>,
] = [true, true, true, true, true, true];
