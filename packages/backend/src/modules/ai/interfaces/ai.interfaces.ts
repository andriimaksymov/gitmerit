import type {
  AnalysisMetadata,
  AnalysisSource,
  CvAiResponse,
  EvidenceCard,
  GithubAiResponse,
  LinkedinAiResponse,
  LinkedinDimension,
  NextAction,
  ProviderName,
  QualitySignal,
} from '../schemas/ai.schemas';

export interface AiAnalysisResponse {
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

export interface AiAnalysisScores {
  overall: number;
  activity: number;
  projectQuality: number;
  techStackDiversity: number;
  consistency: number;
}

export interface LinkedinAnalysisRequest {
  fullName: string;
  title: string;
  headline?: string;
  about: string;
  profileText?: string;
  targetRoles?: string[];
  experience: {
    role: string;
    company: string;
    description: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    achievements?: string[];
  }[];
  skills: string[];
  avatarUrl?: string;
}

export interface LinkedinAnalysisResponse extends LinkedinAiResponse {
  analysisMetadata?: AnalysisMetadata;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
}

export interface CvAnalysisResponse extends CvAiResponse {
  analysisMetadata?: AnalysisMetadata;
  evidence?: EvidenceCard[];
  qualitySignals?: QualitySignal[];
}

export type {
  AnalysisMetadata,
  AnalysisSource,
  EvidenceCard,
  GithubAiResponse,
  LinkedinAiResponse,
  LinkedinDimension,
  NextAction,
  ProviderName,
  QualitySignal,
};
