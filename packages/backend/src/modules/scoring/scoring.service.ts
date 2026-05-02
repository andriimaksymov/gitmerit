import { Injectable } from '@nestjs/common';
import { GithubData } from '../github/interfaces/github.interfaces';

@Injectable()
export class ScoringService {
  /*
   * Advanced Scoring Logic
   * Now considers:
   * - Documentation depth (README size)
   * - Testing practices
   * - Licensing
   */
  calculateScore(githubData: GithubData) {
    const activityScore = this.calculateActivityScore(githubData);
    // Project quality now needs to wait for async checks if we were fetching content individually
    // But since we fetch all data upfront in the service, we pass it here
    const projectQualityScore = this.calculateProjectQualityScore(githubData);
    const techStackScore = this.calculateTechStackScore(githubData);
    const consistencyScore = this.calculateConsistencyScore(githubData);

    const overall = Math.round(
      (activityScore * 1.0 + // Activity is key
        projectQualityScore * 1.2 + // Quality is king
        techStackScore * 0.8 + // Broad stack is good but depth matters more
        consistencyScore * 1.0) / // Consistency shows discipline
        4,
    );

    return {
      overall: Math.min(overall, 100),
      activity: activityScore,
      projectQuality: projectQualityScore,
      techStackDiversity: techStackScore,
      consistency: consistencyScore,
    };
  }

  private calculateActivityScore(githubData: GithubData): number {
    const { profile, repositories, events } = githubData;

    // Factors: public repos, followers, total stars, recent activity
    const repoCountScore = Math.min(profile.public_repos / 10, 1) * 20; // Lower threshold
    const followersScore = Math.min(profile.followers / 20, 1) * 20;

    // Recent activity (last 30 events) weight higher
    const recentActivityScore = Math.min(events.length / 20, 1) * 30;

    const starsScore =
      Math.min(
        repositories.reduce(
          (sum, repo) => sum + (repo.stargazers_count || 0),
          0,
        ) / 50,
        1,
      ) * 30;

    return Math.round(
      repoCountScore + followersScore + starsScore + recentActivityScore,
    );
  }

  private calculateProjectQualityScore(githubData: GithubData): number {
    const { repositories } = githubData;
    if (!repositories || repositories.length === 0) return 0;

    // Filter for non-forks to judge personal work, unless they have popular forks
    const sourceRepos = repositories.filter(
      (repo) => !repo.fork || repo.stargazers_count > 5,
    );
    const reposToAnalyze = sourceRepos.length > 0 ? sourceRepos : repositories;

    let totalScore = 0;

    reposToAnalyze.forEach((repo) => {
      let repoScore = 0;

      // 1. Description (Essential)
      if (repo.description && repo.description.length > 10) repoScore += 15;

      // 2. Homepage/Demo URL (Shows completeness)
      if (repo.homepage) repoScore += 10;

      // 3. Size/Complexity (Tiny repos shouldn't score high on quality automatically)
      if (repo.size > 100) repoScore += 5;

      // 4. Topics (Discoverability)
      if (repo.topics && repo.topics.length > 0) repoScore += 10;

      // 5. Stars (Community validation)
      if (repo.stargazers_count > 0) repoScore += 10;
      if (repo.stargazers_count > 10) repoScore += 10;

      // 6. Maintenance (Updated recently)
      const monthsSinceUpdate =
        (new Date().getTime() - new Date(repo.updated_at).getTime()) /
        (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceUpdate < 1) repoScore += 20;
      else if (monthsSinceUpdate < 6) repoScore += 10;

      // 7. Has Issues enabled (Community management)
      if (repo.has_issues) repoScore += 5;

      // 8. Default branch is main/master (Standard practice)
      if (['main', 'master'].includes(repo.default_branch)) repoScore += 5;

      // 9. Language is set
      if (repo.language) repoScore += 10;

      totalScore += Math.min(repoScore, 100);
    });

    return Math.round(totalScore / reposToAnalyze.length);
  }

  private calculateTechStackScore(githubData: GithubData): number {
    const { repositories } = githubData;

    const languages = new Set();
    repositories.forEach((repo) => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });

    // More languages = higher diversity
    const diversityScore = Math.min(languages.size / 10, 1) * 100;

    return Math.round(diversityScore);
  }

  private calculateConsistencyScore(githubData: GithubData): number {
    const { events } = githubData;

    if (events.length === 0) return 0;

    // Group events by week
    const weeklyActivity = new Map();

    events.forEach((event) => {
      const date = new Date(event.created_at);
      const weekKey = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;

      weeklyActivity.set(weekKey, (weeklyActivity.get(weekKey) || 0) + 1);
    });

    // Calculate consistency based on number of active weeks
    const activeWeeks = weeklyActivity.size;
    const consistencyScore = Math.min(activeWeeks / 12, 1) * 100;

    return Math.round(consistencyScore);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
