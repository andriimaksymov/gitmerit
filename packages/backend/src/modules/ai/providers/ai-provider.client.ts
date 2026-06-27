import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod/v3';
import type { AnalysisSource, ProviderName } from '../interfaces/ai.interfaces';

type RuntimeProviderName = Exclude<ProviderName, 'deterministic'>;

interface RuntimeProvider {
  name: RuntimeProviderName;
  model: string;
}

export interface StructuredTask<T> {
  source: AnalysisSource;
  schemaName: string;
  schema: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
}

export interface ProviderResult<T> {
  data: T;
  provider: RuntimeProviderName;
  model: string;
  warnings: string[];
  confidence: number;
}

const DEFAULT_PROVIDER_ORDER: RuntimeProviderName[] = [
  'openai',
  'gemini',
  'groq',
];

/**
 * Transport + orchestration layer for structured LLM calls. Owns provider
 * client lifecycle, the configured provider fallback order, the schema-repair
 * retry loop, and JSON/schema marshalling. Domain analyzers depend on this and
 * never touch provider SDKs directly.
 */
@Injectable()
export class AiProviderClient {
  private readonly logger = new Logger(AiProviderClient.name);
  private openai: OpenAI | null = null;
  private gemini: GoogleGenAI | null = null;
  private groq: Groq | null = null;
  private readonly openaiModel: string;
  private readonly geminiModel: string;
  private readonly groqModel: string;
  private readonly providerOrder: RuntimeProviderName[];

  constructor(private readonly configService: ConfigService) {
    this.openaiModel =
      this.configService.get<string>('ai.openaiModel') ?? 'gpt-5-mini';
    this.geminiModel =
      this.configService.get<string>('ai.geminiModel') ?? 'gemini-2.5-flash';
    this.groqModel =
      this.configService.get<string>('ai.groqModel') ?? 'openai/gpt-oss-120b';
    this.providerOrder = this.resolveProviderOrder();
    this.initializeClients();
  }

  /**
   * Run a structured task against the first available provider, with a single
   * schema-repair retry, returning null when no provider succeeds (callers fall
   * back to deterministic output).
   */
  async runStructuredTask<T>(
    task: StructuredTask<T>,
  ): Promise<ProviderResult<T> | null> {
    const providers = this.getAvailableProviders();
    const warnings: string[] = [];

    if (!providers.length) {
      warnings.push('No configured AI providers are available.');
      return null;
    }

    for (const provider of providers) {
      try {
        const firstOutput = await this.callProvider(provider, task);
        const parsed = task.schema.safeParse(firstOutput);

        if (parsed.success) {
          return {
            data: parsed.data,
            provider: provider.name,
            model: provider.model,
            warnings,
            confidence: 0.86,
          };
        }

        const validationMessage = parsed.error.issues
          .slice(0, 6)
          .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
          .join('; ');
        warnings.push(
          `${provider.name} returned schema-invalid ${task.source} analysis.`,
        );

        const repairedOutput = await this.callProvider(provider, {
          ...task,
          systemPrompt: `${task.systemPrompt}
Your previous JSON did not match the required schema. Regenerate the full JSON object only.`,
          userPrompt: `${task.userPrompt}

Validation issues to fix: ${validationMessage}`,
        });
        const repaired = task.schema.safeParse(repairedOutput);

        if (repaired.success) {
          return {
            data: repaired.data,
            provider: provider.name,
            model: provider.model,
            warnings: [
              ...warnings,
              `${provider.name} response required one schema repair retry.`,
            ],
            confidence: 0.76,
          };
        }

        warnings.push(
          `${provider.name} repair retry still failed schema validation.`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown provider failure';
        warnings.push(`${provider.name} failed: ${message}`);
        this.logger.warn(
          `${provider.name} ${task.source} generation failed for ${task.schemaName}: ${message}`,
        );
      }
    }

    return null;
  }

  private initializeClients() {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.gemini = new GoogleGenAI({ apiKey: geminiKey });
      this.logger.log(`Gemini provider enabled with model ${this.geminiModel}`);
    }

    const openaiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      this.configService.get<string>('openai.apiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.logger.log(`OpenAI provider enabled with model ${this.openaiModel}`);
    }

    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
      this.logger.log(`Groq provider enabled with model ${this.groqModel}`);
    }

    if (!this.openai && !this.gemini && !this.groq) {
      this.logger.warn(
        'No AI provider keys found. Deterministic analysis fallbacks will be used.',
      );
    }
  }

  private resolveProviderOrder(): RuntimeProviderName[] {
    const configured =
      this.configService.get<string>('ai.providerOrder') ??
      this.configService.get<string>('AI_PROVIDER_ORDER');

    if (!configured) return DEFAULT_PROVIDER_ORDER;

    const names = configured
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter((name): name is RuntimeProviderName =>
        ['openai', 'gemini', 'groq'].includes(name),
      );

    return names.length ? names : DEFAULT_PROVIDER_ORDER;
  }

  private getAvailableProviders(): RuntimeProvider[] {
    return this.providerOrder
      .map((name) => {
        if (name === 'openai' && this.openai) {
          return { name, model: this.openaiModel };
        }
        if (name === 'gemini' && this.gemini) {
          return { name, model: this.geminiModel };
        }
        if (name === 'groq' && this.groq) {
          return { name, model: this.groqModel };
        }
        return null;
      })
      .filter((provider): provider is RuntimeProvider => provider !== null);
  }

  private async callProvider<T>(
    provider: RuntimeProvider,
    task: StructuredTask<T>,
  ): Promise<unknown> {
    if (provider.name === 'openai') {
      if (!this.openai) throw new Error('OpenAI client is not initialized');
      return this.callOpenAi(this.openai, provider.model, task);
    }

    if (provider.name === 'gemini') {
      if (!this.gemini) throw new Error('Gemini client is not initialized');
      return this.callGemini(this.gemini, provider.model, task);
    }

    if (!this.groq) throw new Error('Groq client is not initialized');
    return this.callGroq(this.groq, provider.model, task);
  }

  private async callOpenAi<T>(
    client: OpenAI,
    model: string,
    task: StructuredTask<T>,
  ): Promise<unknown> {
    const completion = await client.chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: task.systemPrompt },
        { role: 'user', content: task.userPrompt },
      ],
      response_format: zodResponseFormat(task.schema, task.schemaName),
    });

    const message = completion.choices[0]?.message;
    if (message?.parsed) return message.parsed;
    if (message?.content) return this.parseJson(message.content);
    throw new Error('OpenAI returned an empty structured response.');
  }

  private async callGemini<T>(
    client: GoogleGenAI,
    model: string,
    task: StructuredTask<T>,
  ): Promise<unknown> {
    const response = await client.models.generateContent({
      model,
      contents: `${task.systemPrompt}\n\n${task.userPrompt}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: this.toJsonSchema(task.schemaName, task.schema),
      },
    });

    if (!response.text) throw new Error('Gemini returned an empty response.');
    return this.parseJson(response.text);
  }

  private async callGroq<T>(
    client: Groq,
    model: string,
    task: StructuredTask<T>,
  ): Promise<unknown> {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: task.systemPrompt },
          { role: 'user', content: task.userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: task.schemaName,
            strict: this.groqSupportsStrictSchema(model),
            schema: this.toJsonSchema(task.schemaName, task.schema),
          },
        },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Groq returned an empty response.');
      return this.parseJson(content);
    } catch (error) {
      this.logger.warn(
        `Groq schema mode failed for ${task.schemaName}; retrying JSON object mode.`,
      );
      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `${task.systemPrompt}\nReturn valid JSON only.`,
          },
          { role: 'user', content: task.userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw error instanceof Error ? error : new Error('Groq failed.');
      }
      return this.parseJson(content);
    }
  }

  private toJsonSchema<T>(
    schemaName: string,
    schema: z.ZodType<T>,
  ): Record<string, unknown> {
    const jsonSchema = zodToJsonSchema(schema, {
      name: schemaName,
      $refStrategy: 'none',
    }) as {
      definitions?: Record<string, unknown>;
      $schema?: string;
      [key: string]: unknown;
    };

    const definition = jsonSchema.definitions?.[schemaName];
    if (definition && typeof definition === 'object') {
      return definition as Record<string, unknown>;
    }

    const { $schema, definitions, ...schemaBody } = jsonSchema;
    void $schema;
    void definitions;
    return schemaBody;
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first >= 0 && last > first) {
        return JSON.parse(cleaned.slice(first, last + 1));
      }
      throw new Error('Provider response was not valid JSON.');
    }
  }

  private groqSupportsStrictSchema(model: string): boolean {
    return model === 'openai/gpt-oss-20b' || model === 'openai/gpt-oss-120b';
  }
}
