import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ExperienceDto {
  @IsString()
  role: string;

  @IsString()
  company: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

export class LinkedInProfileDto {
  @IsString()
  fullName: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsString()
  about: string;

  @IsOptional()
  @IsString()
  profileText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience: ExperienceDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * High-level method that scrapes a profile and runs AI analysis
   */
  async analyzeProfileFromUrl(url: string) {
    this.logger.log(`Starting full LinkedIn analysis for: ${url}`);

    // 1. Fetch/Scrape data
    const profileData = this.fetchProfile(url);

    // 2. URL-only LinkedIn analysis is intentionally limited. We do not
    // scrape or invent public profile data from LinkedIn.
    const aiAnalysis = await this.aiService.generateLinkedinAnalysis(
      profileData,
      {
        limitedEvidence: true,
        sourceLimitations: [
          'LinkedIn URL analysis only extracts the public profile slug. Paste structured profile text into /linkedin/analyze for a high-confidence report.',
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

  fetchProfile(url: string) {
    this.logger.log(`Fetching LinkedIn profile from ${url}`);

    const usernameMatch = url.match(/linkedin\.com\/in\/([^/]+)/);
    const username = usernameMatch ? usernameMatch[1] : 'User';
    const formattedName = username
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // LinkedIn does not expose reliable public profile data for this API.
    // Return only what can be derived from the URL, and let analysis metadata
    // communicate the evidence limitation.
    return {
      fullName: formattedName,
      title: '',
      headline: '',
      about: '',
      profileText: '',
      targetRoles: [],
      skills: [],
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=0284c7&color=fff&size=256`,
      experience: [],
    };
  }
}
