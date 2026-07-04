import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { LinkedinProfileAssessment } from '@gitmerit/shared';
import { LinkedinAnalyzer } from './linkedin-analyzer.service';
import { extractPdfTextWithLayout } from '../../common/pdf.util';

/** Below this, the PDF is almost certainly image-only or not a real profile. */
const MIN_PROFILE_TEXT = 100;

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger(LinkedinService.name);

  constructor(private readonly analyzer: LinkedinAnalyzer) {}

  /**
   * Analyze a LinkedIn profile from its exported PDF: extract the text, then
   * run the section-by-section assessment.
   */
  async analyzeProfileFromPdf(
    buffer: Buffer,
  ): Promise<LinkedinProfileAssessment> {
    const text = await this.extractProfileText(buffer);
    this.logger.log(`Extracted ${text.length} characters from LinkedIn PDF.`);
    return this.analyzer.assess(text);
  }

  /**
   * Extract text from the uploaded PDF, converting unreadable/malformed PDFs
   * into a friendly 422 (instead of a 500) and logging the real cause.
   */
  private async extractProfileText(buffer: Buffer): Promise<string> {
    let text: string;
    try {
      text = await extractPdfTextWithLayout(buffer);
    } catch (err) {
      this.logger.error(
        `LinkedIn PDF parse failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new UnprocessableEntityException(
        'We could not read that PDF. Please re-export your LinkedIn profile (More → Save to PDF) and try again.',
      );
    }

    if (text.trim().length < MIN_PROFILE_TEXT) {
      throw new UnprocessableEntityException(
        'That PDF did not contain enough readable text. Make sure you export your profile as a PDF (not a screenshot or image).',
      );
    }

    return text;
  }
}
