import { z } from 'zod/v3';

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

export type AnalysisSource = z.infer<typeof analysisSourceSchema>;
export type ProviderName = z.infer<typeof providerNameSchema>;
export type AnalysisMetadata = z.infer<typeof analysisMetadataSchema>;
export type QualitySignal = z.infer<typeof qualitySignalSchema>;
export type NextAction = z.infer<typeof nextActionSchema>;
export type EvidenceCard = z.infer<typeof evidenceCardSchema>;
export type GithubAiResponse = z.infer<typeof githubAiResponseSchema>;
export type LinkedinAiResponse = z.infer<typeof linkedinAiResponseSchema>;
export type LinkedinDimension = z.infer<typeof linkedinDimensionSchema>;
export type CvAiResponse = z.infer<typeof cvAiResponseSchema>;
export type CvImprovementCategory = z.infer<typeof cvImprovementCategorySchema>;
