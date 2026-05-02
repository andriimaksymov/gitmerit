import { Controller, Post, Body } from '@nestjs/common';
import { LinkedinService, LinkedInProfileDto } from './linkedin.service';

@Controller('linkedin')
export class LinkedinController {
  constructor(private readonly linkedinService: LinkedinService) {}

  @Post('analyze-url')
  async analyzeUrl(@Body('url') url: string) {
    return this.linkedinService.analyzeProfileFromUrl(url);
  }

  @Post('analyze')
  async analyze(@Body() profile: LinkedInProfileDto) {
    return this.linkedinService.analyzeProfile(profile);
  }

  @Post('fetch')
  fetch(@Body('url') url: string) {
    return this.linkedinService.fetchProfile(url);
  }
}
