import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { LinkedinScraper } from './linkedin.scraper';
import { LinkedInProfileDto } from './dto/linkedin-profile.dto';

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly scraper: LinkedinScraper,
  ) {}

  /**
   * High-level flow: scrape a public profile, then run AI analysis over it.
   */
  async analyzeProfileFromUrl(url: string) {
    this.logger.log(`Starting full LinkedIn analysis for: ${url}`);

    const { scrapingLimited, ...profileData } =
      await this.scraper.scrapeProfile(url);

    const hasData =
      !scrapingLimited && Boolean(profileData.about || profileData.title);

    const aiAnalysis = await this.aiService.generateLinkedinAnalysis(
      profileData,
      {
        limitedEvidence: !hasData,
        sourceLimitations: hasData
          ? []
          : [
              scrapingLimited
                ? 'LinkedIn limited the public view for this profile. Add your About and Skills text below for a complete analysis.'
                : 'Only basic profile info could be extracted publicly. Add your About and Skills text below for a complete analysis.',
            ],
      },
    );

    return {
      profile: profileData,
      analysis: aiAnalysis,
      timestamp: new Date().toISOString(),
      url,
    };
  }

  async analyzeProfile(data: LinkedInProfileDto) {
    this.logger.log(`Analyzing LinkedIn profile for ${data.fullName}`);

    const aiAnalysis = await this.aiService.generateLinkedinAnalysis(data);

    return {
      profile: data,
      analysis: aiAnalysis,
      timestamp: new Date().toISOString(),
    };
  }

  /** Slug-only profile (no network call). */
  fetchProfile(url: string) {
    return this.scraper.fetchProfile(url);
  }
}
