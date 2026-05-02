import { Injectable } from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { ScoringService } from '../scoring/scoring.service';

import { AiService } from '../ai/ai.service';
import {
  AiAnalysisScores,
  EvidenceCard,
  QualitySignal,
} from '../ai/interfaces/ai.interfaces';
import { GithubData } from '../github/interfaces/github.interfaces';
import type { GithubRepo } from '../github/interfaces/github.interfaces';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly githubService: GithubService,
    private readonly scoringService: ScoringService,
    private readonly aiService: AiService,
  ) {}

  async analyzePortfolio(username: string) {
    // Fetch GitHub data
    const githubData: GithubData =
      await this.githubService.getUserData(username);

    // Calculate scores
    const scores = this.scoringService.calculateScore(githubData);
    const { evidence, qualitySignals } = await this.buildGithubEvidence(
      username,
      githubData,
    );

    // AI Analysis (Optional, depends on API Key)
    const aiAnalysis = await this.aiService.generateAiAnalysis(
      githubData.profile,
      githubData.repositories,
      scores,
      evidence,
      qualitySignals,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(scores);

    return {
      username,
      profile: {
        avatarUrl: githubData.profile.avatar_url,
        bio: githubData.profile.bio,
        followers: githubData.profile.followers,
        company: githubData.profile.company,
        location: githubData.profile.location,
        publicRepos: githubData.profile.public_repos,
      },
      overallScore: scores.overall,
      scores: {
        activity: scores.activity,
        projectQuality: scores.projectQuality,
        techStackDiversity: scores.techStackDiversity,
        consistency: scores.consistency,
      },
      aiInsights: aiAnalysis,
      evidence,
      qualitySignals,
      sourceLimitations: aiAnalysis.sourceLimitations ?? [],
      nextActions: aiAnalysis.nextActions ?? [],
      strengths: this.identifyStrengths(scores),
      weaknesses: this.identifyWeaknesses(scores),
      recommendations,
      analyzedAt: new Date().toISOString(),
    };
  }

  private async buildGithubEvidence(
    username: string,
    githubData: GithubData,
  ): Promise<{ evidence: EvidenceCard[]; qualitySignals: QualitySignal[] }> {
    const rankedRepos = this.rankRepositories(githubData.repositories).slice(
      0,
      5,
    );
    const evidence = await Promise.all(
      rankedRepos.map((repo, index) =>
        this.buildRepositoryEvidence(username, repo, index + 1),
      ),
    );

    const qualitySignals: QualitySignal[] = [
      {
        name: 'Repository Evidence',
        status:
          evidence.length >= 3 ? 'strong' : evidence.length ? 'ok' : 'weak',
        evidence: `${evidence.length} repositories enriched with public metadata`,
        score: Math.min(100, evidence.length * 20),
      },
      {
        name: 'Documentation Coverage',
        status: evidence.some((item) =>
          item.signals.some((signal) => signal.includes('README')),
        )
          ? 'ok'
          : 'weak',
        evidence: `${evidence.filter((item) => item.signals.some((signal) => signal.includes('README'))).length}/${evidence.length} analyzed repositories expose README content`,
        score: evidence.length
          ? Math.round(
              (evidence.filter((item) =>
                item.signals.some((signal) => signal.includes('README')),
              ).length /
                evidence.length) *
                100,
            )
          : 0,
      },
    ];

    return { evidence, qualitySignals };
  }

  private async buildRepositoryEvidence(
    username: string,
    repo: GithubRepo,
    index: number,
  ): Promise<EvidenceCard> {
    const [languages, readme, packageJson, license] = await Promise.all([
      this.safeGetRepoLanguages(username, repo.name),
      this.safeGetRepoText(username, repo.name, 'README.md'),
      this.safeGetRepoText(username, repo.name, 'package.json'),
      this.safeGetRepoContent(username, repo.name, 'LICENSE'),
    ]);

    const packageSignals = this.packageSignals(packageJson);
    const technologies = this.presentStrings([
      repo.language,
      ...Object.keys(languages),
      ...repo.topics,
      ...packageSignals.technologies,
    ]);
    const signals = [
      repo.description ? 'Repository has a clear description' : '',
      repo.homepage ? 'Repository links to a homepage or demo' : '',
      readme
        ? `README detected (${Math.min(readme.length, 5000)} chars inspected)`
        : '',
      packageJson ? 'package.json detected' : '',
      ...packageSignals.signals,
      license ? 'License file detected' : '',
      repo.stargazers_count ? `${repo.stargazers_count} public star(s)` : '',
      repo.forks_count ? `${repo.forks_count} fork(s)` : '',
    ].filter(Boolean);
    const gaps = [
      repo.description ? '' : 'Add a concise repository description',
      repo.homepage ? '' : 'Add a live demo, docs, or portfolio link',
      readme ? '' : 'Add or expand the README',
      packageSignals.hasTests
        ? ''
        : 'Expose a test command or test documentation',
      license ? '' : 'Add a license if the project is meant to be reused',
    ].filter(Boolean);

    return {
      id: `repo-${index}-${this.slugify(repo.name)}`,
      source: 'github',
      title: repo.name,
      summary:
        repo.description ??
        `${repo.name} is a ${repo.language ?? 'software'} repository updated on ${repo.updated_at}.`,
      repoName: repo.name,
      url: repo.html_url,
      technologies: [...new Set(technologies)].slice(0, 12),
      signals,
      gaps,
      nextActions: this.repositoryNextActions(
        repo,
        gaps,
        packageSignals.hasTests,
      ),
    };
  }

  private rankRepositories(repositories: GithubRepo[]): GithubRepo[] {
    return [...repositories].sort((a, b) => {
      const forkWeight = Number(!b.fork) - Number(!a.fork);
      if (forkWeight !== 0) return forkWeight;
      const starWeight = b.stargazers_count - a.stargazers_count;
      if (starWeight !== 0) return starWeight;
      const recencyWeight =
        new Date(b.pushed_at || b.updated_at).getTime() -
        new Date(a.pushed_at || a.updated_at).getTime();
      if (recencyWeight !== 0) return recencyWeight;
      return b.size - a.size;
    });
  }

  private async safeGetRepoLanguages(
    username: string,
    repo: string,
  ): Promise<Record<string, number>> {
    try {
      return await this.githubService.getRepoLanguages(username, repo);
    } catch {
      return {};
    }
  }

  private async safeGetRepoText(
    username: string,
    repo: string,
    path: string,
  ): Promise<string | null> {
    const content = await this.safeGetRepoContent(username, repo, path);
    return this.decodeGithubTextContent(content);
  }

  private async safeGetRepoContent(
    username: string,
    repo: string,
    path: string,
  ): Promise<unknown> {
    try {
      return await this.githubService.getRepoContent(username, repo, path);
    } catch {
      return null;
    }
  }

  private decodeGithubTextContent(content: unknown): string | null {
    if (!content || Array.isArray(content) || typeof content !== 'object') {
      return null;
    }

    const file = content as { content?: string; encoding?: string };
    if (!file.content) return null;

    if (file.encoding === 'base64') {
      return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString(
        'utf8',
      );
    }

    return file.content;
  }

  private packageSignals(packageJson: string | null): {
    signals: string[];
    technologies: string[];
    hasTests: boolean;
  } {
    if (!packageJson) {
      return { signals: [], technologies: [], hasTests: false };
    }

    try {
      const parsed = JSON.parse(packageJson) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const scripts = parsed.scripts ?? {};
      const dependencies = {
        ...(parsed.dependencies ?? {}),
        ...(parsed.devDependencies ?? {}),
      };
      const dependencyNames = Object.keys(dependencies);
      const technologies = dependencyNames
        .filter((name) =>
          /react|next|nestjs|express|vue|angular|tailwind|prisma|typeorm|jest|vitest|playwright/i.test(
            name,
          ),
        )
        .slice(0, 8);

      return {
        signals: [
          scripts.test ? 'Test script detected in package.json' : '',
          scripts.build ? 'Build script detected in package.json' : '',
          scripts.lint ? 'Lint script detected in package.json' : '',
          technologies.length
            ? `Recognizable tooling detected: ${technologies.join(', ')}`
            : '',
        ].filter(Boolean),
        technologies,
        hasTests: Boolean(scripts.test),
      };
    } catch {
      return {
        signals: ['package.json detected but could not be parsed'],
        technologies: [],
        hasTests: false,
      };
    }
  }

  private repositoryNextActions(
    repo: GithubRepo,
    gaps: string[],
    hasTests: boolean,
  ): string[] {
    const actions = gaps.slice(0, 3);
    if (!hasTests) {
      actions.push(`Add a visible test strategy for ${repo.name}`);
    }
    actions.push(
      `Describe ${repo.name}'s product impact and architecture tradeoffs`,
    );
    return [...new Set(actions)].slice(0, 4);
  }

  private generateRecommendations(scores: AiAnalysisScores): string[] {
    const recommendations: string[] = [];

    if (scores.activity < 50) {
      recommendations.push(
        'Increase your GitHub activity by contributing more regularly',
      );
    }

    if (scores.projectQuality < 50) {
      recommendations.push('Add comprehensive README files to your projects');
      recommendations.push(
        'Include documentation and examples in your repositories',
      );
    }

    if (scores.techStackDiversity < 50) {
      recommendations.push(
        'Explore different technologies to diversify your skill set',
      );
    }

    if (scores.consistency < 50) {
      recommendations.push('Maintain a more consistent contribution pattern');
    }

    return recommendations;
  }

  private identifyStrengths(scores: AiAnalysisScores): string[] {
    const strengths: string[] = [];

    if (scores.activity >= 70) {
      strengths.push('High GitHub activity');
    }

    if (scores.projectQuality >= 70) {
      strengths.push('Well-documented projects');
    }

    if (scores.techStackDiversity >= 70) {
      strengths.push('Diverse technology stack');
    }

    if (scores.consistency >= 70) {
      strengths.push('Consistent contribution pattern');
    }

    return strengths;
  }

  private identifyWeaknesses(scores: AiAnalysisScores): string[] {
    const weaknesses: string[] = [];

    if (scores.activity < 50) {
      weaknesses.push('Low GitHub activity');
    }

    if (scores.projectQuality < 50) {
      weaknesses.push('Projects need better documentation');
    }

    if (scores.techStackDiversity < 50) {
      weaknesses.push('Limited technology diversity');
    }

    if (scores.consistency < 50) {
      weaknesses.push('Inconsistent contribution pattern');
    }

    return weaknesses;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private presentStrings(values: Array<string | null | undefined>): string[] {
    return values.filter((value): value is string => Boolean(value));
  }
}
