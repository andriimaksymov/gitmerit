import { Injectable } from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { ScoringService } from '../scoring/scoring.service';

import { AiService } from '../ai/ai.service';
import { AiAnalysisScores } from '../ai/interfaces/ai.interfaces';
import { GithubData } from '../github/interfaces/github.interfaces';

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

    // AI Analysis (Optional, depends on API Key)
    const aiAnalysis = await this.aiService.generateAiAnalysis(
      githubData.profile,
      githubData.repositories,
      scores,
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
      strengths: this.identifyStrengths(scores),
      weaknesses: this.identifyWeaknesses(scores),
      recommendations,
      analyzedAt: new Date().toISOString(),
    };
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
}
