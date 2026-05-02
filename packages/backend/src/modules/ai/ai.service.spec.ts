import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import {
  githubAiResponseSchema,
  linkedinAiResponseSchema,
} from './schemas/ai.schemas';
import type {
  GithubProfile,
  GithubRepo,
} from '../github/interfaces/github.interfaces';

const configService = {
  get: jest.fn(() => undefined),
} as unknown as ConfigService;

const validGithubOutput = {
  summary:
    'portfolio-score shows TypeScript evidence from repo-1-portfolio-score.',
  careerPath: 'Full-stack engineering roles.',
  keyStrengths: ['TypeScript portfolio project'],
  improvements: ['Add stronger README outcomes'],
  overview: {
    current: 'Current state',
    working: 'Working well',
    fixFirst: 'Fix documentation first',
  },
  profileSummary: 'TypeScript full-stack builder',
  flagshipProjects: [
    {
      name: 'portfolio-score',
      reason: 'Cites repo-1-portfolio-score evidence.',
      url: 'https://github.com/example/portfolio-score',
      stars: 2,
      technologies: ['TypeScript'],
      improvements: ['Add screenshots'],
      evidenceIds: ['repo-1-portfolio-score'],
    },
  ],
  metricInsights: {
    activity: 'Activity evidence',
    quality: 'Quality evidence',
    stack: 'Stack evidence',
    consistency: 'Consistency evidence',
  },
  checklist: [
    {
      item: 'Improve README',
      metricTag: 'Quality',
      evidenceIds: ['repo-1-portfolio-score'],
    },
  ],
  sourceLimitations: [],
  nextActions: [
    {
      title: 'Improve README',
      detail: 'Add setup, screenshots, and outcomes.',
      priority: 'high',
      metricTag: 'Quality',
      effort: 'short',
      evidenceIds: ['repo-1-portfolio-score'],
    },
  ],
  evidenceReferences: ['repo-1-portfolio-score'],
};

const githubProfile: GithubProfile = {
  id: 1,
  login: 'example',
  name: 'Example User',
  avatar_url: '',
  html_url: 'https://github.com/example',
  bio: null,
  company: null,
  blog: '',
  location: null,
  email: null,
  public_repos: 1,
  followers: 1,
  following: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const githubRepo: GithubRepo = {
  id: 1,
  name: 'portfolio-score',
  full_name: 'example/portfolio-score',
  html_url: 'https://github.com/example/portfolio-score',
  description: 'Portfolio analyzer',
  fork: false,
  language: 'TypeScript',
  stargazers_count: 2,
  watchers_count: 2,
  forks_count: 0,
  topics: ['nestjs'],
  homepage: null,
  size: 120,
  default_branch: 'main',
  has_issues: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  pushed_at: '2026-01-01T00:00:00Z',
};

describe('AI schemas', () => {
  it('accepts valid GitHub output and rejects missing fields', () => {
    expect(githubAiResponseSchema.safeParse(validGithubOutput).success).toBe(
      true,
    );

    const invalid = { ...validGithubOutput };
    delete (invalid as { summary?: string }).summary;

    expect(githubAiResponseSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects malformed LinkedIn dimensions', () => {
    expect(
      linkedinAiResponseSchema.safeParse({
        summary: { text: 'x', seniorityGuess: 'Mid' },
        dimensions: { overall: 150 },
      }).success,
    ).toBe(false);
  });
});

describe('AiService', () => {
  it('uses deterministic GitHub fallback when no provider is configured', async () => {
    const service = new AiService(configService);

    const result = await service.generateAiAnalysis(
      githubProfile,
      [githubRepo],
      {
        overall: 52,
        activity: 40,
        projectQuality: 55,
        techStackDiversity: 30,
        consistency: 60,
      },
      [
        {
          id: 'repo-1-portfolio-score',
          source: 'github',
          title: 'portfolio-score',
          summary: 'TypeScript portfolio project',
          repoName: 'portfolio-score',
          url: githubRepo.html_url,
          technologies: ['TypeScript'],
          signals: ['README detected'],
          gaps: ['Add screenshots'],
          nextActions: ['Improve README'],
        },
      ],
      [],
    );

    expect(result.analysisMetadata?.provider).toBe('deterministic');
    expect(result.flagshipProjects[0].name).toBe('portfolio-score');
    expect(result.evidenceReferences).toContain('repo-1-portfolio-score');
  });

  it('repairs schema-invalid provider output once', async () => {
    const service = new AiService(configService);
    const harness = service as unknown as {
      runStructuredTask: <T>(task: unknown) => Promise<T>;
      getAvailableProviders: jest.Mock;
      callProvider: jest.Mock;
    };

    jest
      .spyOn(service as any, 'getAvailableProviders')
      .mockReturnValue([{ name: 'openai', model: 'test-model' }]);
    jest
      .spyOn(service as any, 'callProvider')
      .mockResolvedValueOnce({ summary: 'invalid' })
      .mockResolvedValueOnce(validGithubOutput);

    const result = await harness.runStructuredTask<{
      provider: string;
      data: typeof validGithubOutput;
      warnings: string[];
    }>({
      source: 'github',
      schemaName: 'github_analysis',
      schema: githubAiResponseSchema,
      systemPrompt: 'Return JSON',
      userPrompt: 'Analyze',
    });

    expect(result.provider).toBe('openai');
    expect(result.data.summary).toContain('portfolio-score');
    expect(result.warnings.some((warning) => warning.includes('repair'))).toBe(
      true,
    );
  });

  it('sanitizes unsupported LinkedIn metrics and invented companies', async () => {
    const service = new AiService(configService);
    const providerOutput = {
      summary: {
        text: 'Delivered 50% growth at supplied company.',
        seniorityGuess: 'Senior',
      },
      dimensions: {
        profile: { score: 80, status: 'Strong', insights: ['Good'] },
        headline: { score: 80, status: 'Strong', insights: ['Good'] },
        experience: { score: 80, status: 'Strong', insights: ['Good'] },
        skills: { score: 80, status: 'Strong', insights: ['Good'] },
        branding: { score: 80, status: 'Strong', insights: ['Good'] },
        overall: 80,
      },
      recommendations: {
        headlines: ['Engineer driving 50% growth'],
        aboutSuggestions: {
          missing: 'Metrics',
          rewritten: 'I drive 50% measurable outcomes.',
        },
        experienceEdits: [
          {
            role: 'Engineer',
            company: 'Invented Co',
            improvements: ['Improved revenue by 50%'],
          },
        ],
      },
      missingKeywords: ['System Design'],
      actionPlan: {
        thisWeek: ['Add 50% metric'],
        next30Days: ['Post 2 articles'],
        next60Days: ['Grow by 100 followers'],
      },
      sourceLimitations: [],
      nextActions: [
        {
          title: 'Add 50% metric',
          detail: 'Use the 50% result',
          priority: 'high',
          metricTag: 'Branding',
          effort: 'short',
          evidenceIds: ['linkedin-profile-input'],
        },
      ],
    };

    jest
      .spyOn(service as any, 'getAvailableProviders')
      .mockReturnValue([{ name: 'openai', model: 'test-model' }]);
    jest
      .spyOn(service as any, 'callProvider')
      .mockResolvedValue(providerOutput);

    const result = await service.generateLinkedinAnalysis({
      fullName: 'Alex Example',
      title: 'Software Engineer',
      about:
        'Software engineer building internal tools with React and Node.js for operations teams.',
      profileText:
        'Software engineer building internal tools with React and Node.js for operations teams.',
      experience: [
        {
          role: 'Software Engineer',
          company: 'Supplied Co',
          description: 'Built internal tools with React and Node.js.',
        },
      ],
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    });

    expect(result.summary.text).toContain('measurable');
    expect(result.recommendations.headlines[0]).toContain('measurable');
    expect(result.recommendations.experienceEdits).toHaveLength(0);
  });

  it('returns low-confidence CV fallback for unreadable extracted text', async () => {
    const service = new AiService(configService);

    const result = await service.generateCvAnalysis('scan');

    expect(result.analysisMetadata?.provider).toBe('deterministic');
    expect(result.analysisMetadata?.confidence).toBeLessThan(0.3);
    expect(result.improvements).toEqual([]);
  });

  it('keeps deterministic CV improvement quotes exact and uses job description keywords', async () => {
    const service = new AiService(configService);
    const text = `
SUMMARY
Software engineer building web applications with React and Node.js.

EXPERIENCE
- Responsible for maintaining dashboard features and fixing bugs for customer teams.
- Worked on API integrations with product managers and designers.
- Built reusable React components for analytics workflows and collaborated with backend engineers on Node.js services.
- Maintained TypeScript utilities, reviewed pull requests, and supported production releases for internal users.
- Assisted with incident follow-up, documentation updates, and release notes for cross-functional stakeholders.
- Participated in sprint planning, backlog refinement, and QA validation for business-critical dashboard features.

SKILLS
React, Node.js, TypeScript

PROJECTS
Created a portfolio dashboard using React, TypeScript, REST APIs, PostgreSQL, and automated tests.

EDUCATION
Bachelor of Science in Computer Science
`;

    const result = await service.generateCvAnalysis(text, {
      jobDescription: 'Requires Redis and Terraform experience.',
    });

    expect(result.improvements.length).toBeGreaterThan(0);
    expect(text).toContain(result.improvements[0].quote);
    expect(result.missingKeywords).toContain('Redis');
    expect(result.missingKeywords).toContain('Terraform');
  });
});
