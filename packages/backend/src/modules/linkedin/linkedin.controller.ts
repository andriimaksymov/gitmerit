import { Controller, Post, Body } from '@nestjs/common';
import { LinkedinService } from './linkedin.service';
import { LinkedInProfileDto } from './dto/linkedin-profile.dto';
import { AnalyzeUrlDto } from './dto/analyze-url.dto';

@Controller('linkedin')
export class LinkedinController {
  constructor(private readonly linkedinService: LinkedinService) {}

  @Post('analyze-url')
  async analyzeUrl(@Body() { url }: AnalyzeUrlDto) {
    return this.linkedinService.analyzeProfileFromUrl(url);
  }

  @Post('analyze')
  async analyze(@Body() profile: LinkedInProfileDto) {
    return this.linkedinService.analyzeProfile(profile);
  }

  @Post('fetch')
  fetch(@Body() { url }: AnalyzeUrlDto) {
    return this.linkedinService.fetchProfile(url);
  }
}
