import { z } from 'zod/v3';
import type { LinkedinSectionAnalysis } from '@gitmerit/shared';

/**
 * Contract the AI must return for a single section. Uses zod/v3 for
 * compatibility with the OpenAI structured-output helper in AiProviderClient.
 */
export const sectionAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(['strong', 'ok', 'weak', 'missing']),
  currentState: z.string(),
  recommendation: z.string(),
  actions: z.array(z.string()),
});

// Compile-time guard: keep the schema aligned with the shared contract.
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const SECTION_SCHEMA_CONFORMS: Equals<
  z.infer<typeof sectionAnalysisSchema>,
  LinkedinSectionAnalysis
> = true;
