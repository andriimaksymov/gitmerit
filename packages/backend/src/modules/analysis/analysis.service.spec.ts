import { AnalysisService } from './analysis.service';
import type {
  GithubData,
  GithubRepo,
} from '../github/interfaces/github.interfaces';
import type { AiService } from '../ai/ai.service';
import type {
  EvidenceCard,
  QualitySignal,
} from '../ai/interfaces/ai.interfaces';
import type { GithubService } from '../github/github.service';
import type { ScoringService } from '../scoring/scoring.service';

const baseRepo = (name: string, language: string): GithubRepo => ({
  id: Math.random(),
  name,
  full_name: `example/${name}`,
  html_url: `https://github.com/example/${name}`,
  description: `${name} project`,
  fork: false,
  language,
  stargazers_count: name === 'portfolio-score' ? 4 : 1,
  watchers_count: 1,
  forks_count: 0,
  topics: ['portfolio'],
  homepage: null,
  size: 200,
  default_branch: 'main',
  has_issues: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  pushed_at: '2026-01-01T00:00:00Z',
});

const githubData = (repo: GithubRepo): GithubData => ({
  profile: {
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
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  repositories: [repo],
  events: [],
});

describe('AnalysisService evidence pipeline', () => {
  const scores = {
    overall: 60,
    activity: 45,
    projectQuality: 70,
    techStackDiversity: 30,
    consistency: 50,
  };

  const createService = (data: GithubData, contentFailure = false) => {
    const githubService = {
      getUserData: jest.fn().mockResolvedValue(data),
      getRepoLanguages: jest.fn().mockResolvedValue({
        [data.repositories[0].language ?? 'TypeScript']: 1000,
      }),
      getRepoContent: jest.fn((_: string, __: string, path: string) => {
        if (contentFailure) return Promise.reject(new Error('rate limited'));
        if (path === 'README.md') {
          return Promise.resolve({
            encoding: 'base64',
            content: Buffer.from('# Project\nUseful docs').toString('base64'),
          });
        }
        if (path === 'package.json') {
          return Promise.resolve({
            encoding: 'base64',
            content: Buffer.from(
              JSON.stringify({
                scripts: { test: 'jest', build: 'nest build' },
                dependencies: { react: '^19.0.0' },
              }),
            ).toString('base64'),
          });
        }
        if (path === 'LICENSE') {
          return Promise.resolve({
            encoding: 'base64',
            content: Buffer.from('MIT').toString('base64'),
          });
        }
        return Promise.resolve(null);
      }),
    } as unknown as GithubService;

    const scoringService = {
      calculateScore: jest.fn().mockReturnValue(scores),
    } as unknown as ScoringService;

    const aiService = {
      generateAiAnalysis: jest.fn(
        (
          _profile: unknown,
          _repos: unknown,
          _scores: unknown,
          evidence: EvidenceCard[],
          qualitySignals: QualitySignal[],
        ) => ({
          summary: `Analyzed ${evidence[0]?.title}`,
          careerPath: 'Full-stack engineering',
          keyStrengths: ['Project evidence'],
          improvements: ['Improve docs'],
          overview: {
            current: 'Current',
            working: 'Working',
            fixFirst: 'Fix docs',
          },
          profileSummary: 'Evidence-backed profile',
          flagshipProjects: [],
          metricInsights: {
            activity: 'Activity',
            quality: 'Quality',
            stack: 'Stack',
            consistency: 'Consistency',
          },
          checklist: [],
          sourceLimitations: [],
          nextActions: [],
          evidence,
          qualitySignals,
        }),
      ),
    } as unknown as AiService;

    return {
      service: new AnalysisService(githubService, scoringService, aiService),
      aiService,
    };
  };

  it('builds different evidence for different GitHub repositories', async () => {
    const first = createService(
      githubData(baseRepo('portfolio-score', 'TypeScript')),
    );
    const second = createService(githubData(baseRepo('api-service', 'Go')));

    const firstResult = await first.service.analyzePortfolio('example');
    const secondResult = await second.service.analyzePortfolio('example');

    expect(firstResult.evidence[0].title).toBe('portfolio-score');
    expect(secondResult.evidence[0].title).toBe('api-service');
    expect(firstResult.evidence[0].technologies).toContain('TypeScript');
    expect(secondResult.evidence[0].technologies).toContain('Go');
  });

  it('degrades gracefully when repository content cannot be fetched', async () => {
    const { service } = createService(
      githubData(baseRepo('limited-repo', 'TypeScript')),
      true,
    );

    const result = await service.analyzePortfolio('example');

    expect(result.evidence[0].title).toBe('limited-repo');
    expect(result.evidence[0].gaps).toContain('Add or expand the README');
  });
});
