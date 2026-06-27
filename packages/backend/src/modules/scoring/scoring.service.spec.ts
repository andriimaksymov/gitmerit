import { ScoringService } from './scoring.service';
import {
  GithubData,
  GithubEvent,
  GithubProfile,
  GithubRepo,
} from '../github/interfaces/github.interfaces';

/**
 * Characterization tests: they pin the CURRENT scoring behaviour so the
 * scoring weights can be refactored later without silently changing output.
 * Time-dependent logic (repo "recency") is frozen via fake timers.
 */
const NOW = new Date('2026-06-27T00:00:00.000Z');

const makeProfile = (
  overrides: Partial<GithubProfile> = {},
): GithubProfile => ({
  id: 1,
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: '',
  html_url: '',
  bio: null,
  company: null,
  blog: '',
  location: null,
  email: null,
  public_repos: 0,
  followers: 0,
  following: 0,
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const makeRepo = (overrides: Partial<GithubRepo> = {}): GithubRepo => ({
  id: 1,
  name: 'repo',
  full_name: 'octocat/repo',
  html_url: '',
  description: null,
  fork: false,
  language: null,
  stargazers_count: 0,
  watchers_count: 0,
  forks_count: 0,
  topics: [],
  homepage: null,
  size: 0,
  default_branch: 'main',
  has_issues: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2026-06-20T00:00:00.000Z',
  pushed_at: '2026-06-20T00:00:00.000Z',
  ...overrides,
});

const makeEvent = (overrides: Partial<GithubEvent> = {}): GithubEvent => ({
  id: 'e1',
  type: 'PushEvent',
  actor: { id: 1, login: 'octocat', avatar_url: '' },
  repo: { id: 1, name: 'octocat/repo', url: '' },
  payload: {},
  public: true,
  created_at: '2026-06-20T00:00:00.000Z',
  ...overrides,
});

describe('ScoringService', () => {
  let service: ScoringService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    service = new ScoringService();
  });

  it('returns all-zero scores for an empty profile', () => {
    const data: GithubData = {
      profile: makeProfile(),
      repositories: [],
      events: [],
    };

    expect(service.calculateScore(data)).toEqual({
      overall: 0,
      activity: 0,
      projectQuality: 0,
      techStackDiversity: 0,
      consistency: 0,
    });
  });

  it('awards a perfect project-quality score to a fully-signalled repo', () => {
    const data: GithubData = {
      profile: makeProfile({ public_repos: 5, followers: 10 }),
      repositories: [
        makeRepo({
          description: 'A meaningful project description.',
          homepage: 'https://example.com',
          size: 200,
          topics: ['typescript'],
          stargazers_count: 12,
          updated_at: '2026-06-20T00:00:00.000Z',
          has_issues: true,
          default_branch: 'main',
          language: 'TypeScript',
        }),
      ],
      events: [makeEvent(), makeEvent({ id: 'e2' })],
    };

    const result = service.calculateScore(data);
    expect(result.projectQuality).toBe(100);
    expect(result.techStackDiversity).toBe(10);
  });

  it('caps the overall score at 100', () => {
    const strongRepos = Array.from({ length: 10 }, (_, i) =>
      makeRepo({
        id: i,
        name: `repo-${i}`,
        description: 'A meaningful project description.',
        homepage: 'https://example.com',
        size: 500,
        topics: ['a', 'b'],
        stargazers_count: 100,
        updated_at: '2026-06-20T00:00:00.000Z',
        has_issues: true,
        language: ['TypeScript', 'Go', 'Rust', 'Python', 'Java'][i % 5],
      }),
    );
    const events = Array.from({ length: 40 }, (_, i) =>
      makeEvent({
        id: `e${i}`,
        created_at: `2026-0${(i % 5) + 1}-10T00:00:00.000Z`,
      }),
    );
    const data: GithubData = {
      profile: makeProfile({ public_repos: 100, followers: 500 }),
      repositories: strongRepos,
      events,
    };

    const result = service.calculateScore(data);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.overall).toBeGreaterThan(0);
  });

  it('scores project quality 0 when there are no repositories', () => {
    const data: GithubData = {
      profile: makeProfile({ public_repos: 3, followers: 5 }),
      repositories: [],
      events: [makeEvent()],
    };
    expect(service.calculateScore(data).projectQuality).toBe(0);
  });

  it('counts distinct languages for tech-stack diversity', () => {
    const data: GithubData = {
      profile: makeProfile(),
      repositories: [
        makeRepo({ id: 1, language: 'TypeScript' }),
        makeRepo({ id: 2, language: 'TypeScript' }),
        makeRepo({ id: 3, language: 'Go' }),
        makeRepo({ id: 4, language: null }),
      ],
      events: [],
    };
    // 2 distinct languages -> min(2/10,1)*100 = 20
    expect(service.calculateScore(data).techStackDiversity).toBe(20);
  });
});
