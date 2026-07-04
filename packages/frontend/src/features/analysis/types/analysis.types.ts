// Cross-cutting primitives come from the shared package (single source of
// truth with the backend). Re-exported so existing local imports still resolve.
export type {
  AnalysisScores,
  AnalysisMetadata,
  EvidenceCard,
  QualitySignal,
  NextAction,
} from '@gitmerit/shared';

import type {
  AnalysisMetadata,
  AnalysisScores,
  EvidenceCard,
  QualitySignal,
  NextAction,
} from '@gitmerit/shared';

export interface AiInsights {
  summary: string;
  careerPath: string;
  keyStrengths: string[];
  improvements: string[];
  overview: {
    current: string;
    working: string;
    fixFirst: string;
  };
  profileSummary: string;
  flagshipProjects: {
    name: string;
    reason: string;
    url: string;
    stars: number;
    technologies: string[];
    improvements: string[];
    evidenceIds?: string[];
  }[];
  metricInsights: {
    activity: string;
    quality: string;
    stack: string;
    consistency: string;
  };
  checklist: {
    item: string;
    metricTag: string;
    evidenceIds?: string[];
  }[];
  analysisMetadata?: AnalysisMetadata;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
  sourceLimitations?: string[];
  nextActions?: NextAction[];
  evidenceReferences?: string[];
}

export interface AnalysisResult {
  username: string;
  profile: {
    avatarUrl: string;
    bio: string | null;
    followers: number;
    company: string | null;
    location: string | null;
    publicRepos: number;
  };
  overallScore: number;
  // Derived from the shared contract so the shape cannot drift from the API.
  scores: Omit<AnalysisScores, 'overall'>;
  aiInsights?: AiInsights;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
  sourceLimitations?: string[];
  nextActions?: NextAction[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  analyzedAt: string;
  /** Shareable report id when history is configured on the server. */
  reportId?: string | null;
}

export interface AnalyzePortfolioRequest {
  username: string;
}

/** Summary row returned by GET /api/reports. */
export interface ReportSummary {
  id: string;
  source: 'github' | 'linkedin' | 'cv';
  subject: string;
  overallScore: number | null;
  createdAt: string;
}

/** Full stored report returned by GET /api/reports/:id. */
export interface StoredReport extends ReportSummary {
  payload: unknown;
}

/** Response body of POST /api/cv/upload. */
export interface CvUploadResponse {
  fullText: string;
  analysis: CvAnalysisResult;
  /** Shareable report id when history is configured on the server. */
  reportId?: string | null;
}

export interface CvAnalysisResult {
  summary: {
    critique: string;
    professionalLikelihood: number;
  };
  improvements: {
    category: string;
    suggestion: string;
    quote: string;
    rewritten: string;
    evidenceIds?: string[];
  }[];
  missingKeywords: string[];
  analysisMetadata?: AnalysisMetadata;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
  sourceLimitations?: string[];
  nextActions?: NextAction[];
}
