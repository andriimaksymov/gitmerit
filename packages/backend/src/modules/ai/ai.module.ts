import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiProviderClient } from './providers/ai-provider.client';

@Module({
  imports: [ConfigModule],
  providers: [AiService, AiProviderClient],
  exports: [AiService],
})
export class AiModule {}
