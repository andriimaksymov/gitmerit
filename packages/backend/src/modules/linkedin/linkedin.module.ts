import { Module } from '@nestjs/common';
import { LinkedinController } from './linkedin.controller';
import { LinkedinService } from './linkedin.service';
import { LinkedinScraper } from './linkedin.scraper';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [LinkedinController],
  providers: [LinkedinService, LinkedinScraper],
})
export class LinkedinModule {}
