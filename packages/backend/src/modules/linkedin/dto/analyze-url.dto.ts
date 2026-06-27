import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body for the URL-based LinkedIn endpoints. Replacing the raw `@Body('url')`
 * string param with a DTO lets the global ValidationPipe reject empty/invalid
 * input instead of silently scraping a `user` fallback.
 */
export class AnalyzeUrlDto {
  @IsString()
  @IsNotEmpty()
  url: string;
}
