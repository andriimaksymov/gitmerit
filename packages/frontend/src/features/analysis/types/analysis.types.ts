// Cross-cutting primitives come from the shared package (single source of
// truth with the backend). Re-exported so existing local imports still resolve.
export type {
  AnalysisScores,
  AnalysisMetadata,
  EvidenceCard,
  QualitySignal,
  NextAction,
} from '@portfolio/shared';

import type { AnalysisMetadata, EvidenceCard, QualitySignal, NextAction } from '@portfolio/shared';

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
  scores: {
    activity: number;
    projectQuality: number;
    techStackDiversity: number;
    consistency: number;
  };
  aiInsights?: AiInsights;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
  sourceLimitations?: string[];
  nextActions?: NextAction[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  analyzedAt: string;
}

export interface AnalyzePortfolioRequest {
  username: string;
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

export interface LinkedInProfile {
  fullName: string;
  avatarUrl?: string;
  title?: string;
  headline?: string;
  about?: string;
}

export interface LinkedInAnalysisResult {
  summary: {
    text: string;
    seniorityGuess: string;
  };
  dimensions: {
    overall: number;
    profile: { score: number; status: string; insights: string[] };
    headline: { score: number; status: string; insights: string[] };
    experience: { score: number; status: string; insights: string[] };
    skills: { score: number; status: string; insights: string[] };
    branding: { score: number; status: string; insights: string[] };
  };
  recommendations: {
    headlines: string[];
    aboutSuggestions: {
      missing: string;
      rewritten: string;
    };
    experienceEdits: {
      role: string;
      company: string;
      improvements: string[];
    }[];
  };
  missingKeywords: string[];
  actionPlan: {
    thisWeek: string[];
    next30Days: string[];
    next60Days: string[];
  };
  analysisMetadata?: AnalysisMetadata;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
  sourceLimitations?: string[];
  nextActions?: NextAction[];
}
