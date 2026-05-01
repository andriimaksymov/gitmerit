import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExperienceDto {
  @IsString()
  role: string;

  @IsString()
  company: string;

  @IsString()
  description: string;
}

export class LinkedInProfileDto {
  @IsString()
  fullName: string;

  @IsString()
  title: string;

  @IsString()
  about: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience: ExperienceDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

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
    const profileData = await this.fetchProfile(url);

    // 2. Run AI Analysis
    const aiAnalysis =
      await this.aiService.generateLinkedinAnalysis(profileData);

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

  async fetchProfile(url: string) {
    this.logger.log(`Fetching LinkedIn profile from ${url}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const usernameMatch = url.match(/linkedin\.com\/in\/([^/]+)/);
    const username = usernameMatch ? usernameMatch[1] : 'User';
    const formattedName = username
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    // Mocked data extracted from a "public profile"
    return {
      fullName: formattedName,
      title: 'Software Engineer at Innovative Solutions',
      about: `Software Engineer with 4+ years of experience in full-stack development. I love building scalable web applications and exploring new technologies. Looking for my next big challenge in the fintech space.`,
      skills: [
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'PostgreSQL',
        'Docker',
      ],
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=0284c7&color=fff&size=256`,
      experience: [
        {
          role: 'Junior Software Engineer',
          company: 'Innovative Solutions',
          description:
            'Developed and maintained various web applications using React and Node.js. Improved application performance by 20%.',
        },
        {
          role: 'Frontend Developer Intern',
          company: 'WebCraft Agency',
          description:
            'Assisted in building responsive websites for clients. Learned the basics of modern web development and version control.',
        },
      ],
    };
  }
}
