import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod/v3';
import type {
  GithubProfile,
  GithubRepo,
} from '../github/interfaces/github.interfaces';
import {
  buildCvPrompt,
  buildGithubPrompt,
  buildLinkedinPrompt,
} from './prompts/ai-prompts';
import {
  cvAiResponseSchema,
  githubAiResponseSchema,
  linkedinAiResponseSchema,
} from './schemas/ai.schemas';
import type {
  AiAnalysisResponse,
  AiAnalysisScores,
  AnalysisMetadata,
  AnalysisSource,
  CvAnalysisResponse,
  EvidenceCard,
  LinkedinAnalysisRequest,
  LinkedinAnalysisResponse,
  NextAction,
  ProviderName,
  QualitySignal,
} from './interfaces/ai.interfaces';

export type {
  CvAnalysisResponse,
  LinkedinAnalysisRequest,
  LinkedinAnalysisResponse,
} from './interfaces/ai.interfaces';

export interface CvAnalysisOptions {
  targetRole?: string;
  seniority?: string;
  jobDescription?: string;
}

export interface LinkedinAnalysisContext {
  limitedEvidence?: boolean;
  sourceLimitations?: string[];
}

type RuntimeProviderName = Exclude<ProviderName, 'deterministic'>;

interface RuntimeProvider {
  name: RuntimeProviderName;
  model: string;
}

interface StructuredTask<T> {
  source: AnalysisSource;
  schemaName: string;
  schema: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
}

interface ProviderResult<T> {
  data: T;
  provider: RuntimeProviderName;
  model: string;
  warnings: string[];
  confidence: number;
}

interface CvEvidence {
  sections: Record<string, string>;
  weakBullets: string[];
  detectedTechnologies: string[];
  evidence: EvidenceCard[];
  qualitySignals: QualitySignal[];
  sourceLimitations: string[];
  isReadable: boolean;
}

const SCHEMA_VERSION = 'career-analysis-v2';
const GENERIC_MODEL = 'deterministic-rules-v2';
const DEFAULT_PROVIDER_ORDER: RuntimeProviderName[] = [
  'openai',
  'gemini',
  'groq',
];

const COMMON_SOFTWARE_KEYWORDS = [
  'TypeScript',
  'React',
  'Node.js',
  'REST APIs',
  'GraphQL',
  'PostgreSQL',
  'Docker',
  'Kubernetes',
  'CI/CD',
  'Cloud',
  'Testing',
  'System Design',
  'Performance',
  'Observability',
  'Security',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
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

  async generateAiAnalysis(
    profile: GithubProfile,
    repos: GithubRepo[],
    scores: AiAnalysisScores,
    evidence: EvidenceCard[] = [],
    qualitySignals: QualitySignal[] = [],
  ): Promise<AiAnalysisResponse> {
    const fallback = this.buildGithubFallback(
      profile,
      repos,
      scores,
      evidence,
      qualitySignals,
      [],
    );
    const prompt = buildGithubPrompt(
      profile,
      repos,
      scores,
      evidence,
      qualitySignals,
    );

    const result = await this.runStructuredTask({
      source: 'github',
      schemaName: 'github_analysis',
      schema: githubAiResponseSchema,
      ...prompt,
    });

    if (!result) return fallback;

    const grounded = this.isGithubOutputGrounded(result.data, repos, evidence);
    if (!grounded) {
      return this.buildGithubFallback(
        profile,
        repos,
        scores,
        evidence,
        qualitySignals,
        [
          ...result.warnings,
          'AI output was replaced because it did not cite supplied GitHub evidence.',
        ],
      );
    }

    return {
      ...result.data,
      analysisMetadata: this.createMetadata(
        'github',
        result.provider,
        result.model,
        result.confidence,
        result.warnings,
      ),
      evidence,
      qualitySignals,
      sourceLimitations: this.unique([
        ...result.data.sourceLimitations,
        ...result.warnings,
      ]),
    };
  }

  async generateLinkedinAnalysis(
    data: LinkedinAnalysisRequest,
    context: LinkedinAnalysisContext = {},
  ): Promise<LinkedinAnalysisResponse> {
    const sourceLimitations = this.unique(context.sourceLimitations ?? []);
    const evidence = this.buildLinkedinEvidence(data, sourceLimitations);
    const qualitySignals = this.buildLinkedinQualitySignals(data);
    const hasEnoughEvidence = this.hasMeaningfulLinkedinEvidence(data);

    if (context.limitedEvidence || !hasEnoughEvidence) {
      return this.buildLinkedinFallback(data, evidence, qualitySignals, [
        ...sourceLimitations,
        'LinkedIn analysis is limited because no profile text or structured profile details were supplied.',
      ]);
    }

    const prompt = buildLinkedinPrompt(data, sourceLimitations);
    const result = await this.runStructuredTask({
      source: 'linkedin',
      schemaName: 'linkedin_analysis',
      schema: linkedinAiResponseSchema,
      ...prompt,
    });

    if (!result) {
      return this.buildLinkedinFallback(data, evidence, qualitySignals, [
        ...sourceLimitations,
        'AI providers were unavailable or returned invalid LinkedIn analysis.',
      ]);
    }

    const sanitized = this.sanitizeLinkedinOutput(result.data, data);

    return {
      ...sanitized,
      analysisMetadata: this.createMetadata(
        'linkedin',
        result.provider,
        result.model,
        result.confidence,
        [...sourceLimitations, ...result.warnings],
      ),
      evidence,
      qualitySignals,
      sourceLimitations: this.unique([
        ...sanitized.sourceLimitations,
        ...sourceLimitations,
        ...result.warnings,
      ]),
    };
  }

  async generateCvAnalysis(
    text: string,
    options: CvAnalysisOptions = {},
  ): Promise<CvAnalysisResponse> {
    const cvEvidence = this.extractCvEvidence(text, options);

    if (!cvEvidence.isReadable) {
      return this.buildCvFallback(text, options, cvEvidence, [
        'The extracted PDF text is too short or sparse for reliable AI analysis.',
      ]);
    }

    const prompt = buildCvPrompt({
      textPreview: this.truncate(text, 30000),
      sections: cvEvidence.sections,
      weakBullets: cvEvidence.weakBullets,
      detectedTechnologies: cvEvidence.detectedTechnologies,
      targetRole: options.targetRole,
      seniority: options.seniority,
      jobDescription: options.jobDescription,
      sourceLimitations: cvEvidence.sourceLimitations,
      evidence: cvEvidence.evidence,
    });

    const result = await this.runStructuredTask({
      source: 'cv',
      schemaName: 'cv_analysis',
      schema: cvAiResponseSchema,
      ...prompt,
    });

    if (!result) {
      return this.buildCvFallback(text, options, cvEvidence, [
        'AI providers were unavailable or returned invalid CV analysis.',
      ]);
    }

    const { response, warnings } = this.ensureCvQuotesExist(
      result.data,
      text,
      options,
      cvEvidence,
    );

    return {
      ...response,
      analysisMetadata: this.createMetadata(
        'cv',
        result.provider,
        result.model,
        warnings.length ? 0.72 : result.confidence,
        [...cvEvidence.sourceLimitations, ...result.warnings, ...warnings],
      ),
      evidence: cvEvidence.evidence,
      qualitySignals: cvEvidence.qualitySignals,
      sourceLimitations: this.unique([
        ...response.sourceLimitations,
        ...cvEvidence.sourceLimitations,
        ...result.warnings,
        ...warnings,
      ]),
    };
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

  private async runStructuredTask<T>(
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

  private createMetadata(
    source: AnalysisSource,
    provider: ProviderName,
    model: string,
    confidence: number,
    warnings: string[],
  ): AnalysisMetadata {
    return {
      source,
      provider,
      model,
      schemaVersion: SCHEMA_VERSION,
      confidence: Math.max(0, Math.min(1, confidence)),
      warnings: this.unique(warnings).slice(0, 8),
      generatedAt: new Date().toISOString(),
    };
  }

  private buildGithubFallback(
    profile: GithubProfile,
    repos: GithubRepo[],
    scores: AiAnalysisScores,
    evidence: EvidenceCard[],
    qualitySignals: QualitySignal[],
    warnings: string[],
  ): AiAnalysisResponse {
    const rankedRepos = this.rankGithubRepos(repos).slice(0, 3);
    const technologies = this.unique(
      this.presentStrings([
        ...repos.map((repo) => repo.language).filter(Boolean),
        ...evidence.flatMap((item) => item.technologies),
      ]),
    ).slice(0, 8);
    const topEvidence = evidence.length
      ? evidence
      : rankedRepos.map((repo, index) =>
          this.repoToEvidenceCard(repo, index + 1, technologies),
        );
    const nextActions = this.githubNextActions(scores, topEvidence);
    const strengths = this.githubStrengths(scores, technologies);
    const improvements = this.githubImprovements(scores, topEvidence);
    const primaryRepo = rankedRepos[0]?.name ?? 'the strongest repository';

    return {
      summary: `${profile.login} shows ${this.scoreLabel(scores.overall)} portfolio readiness, with ${primaryRepo} standing out among ${repos.length} public repositories. The strongest signals are ${strengths.slice(0, 2).join(' and ') || 'early project foundations'}, while the clearest next step is ${improvements[0] ?? 'adding more evidence to flagship projects'}.`,
      careerPath: this.githubCareerPath(scores, technologies),
      keyStrengths: strengths,
      improvements,
      overview: {
        current: `${profile.login} has ${repos.length} public repositories and a ${scores.overall}/100 overall portfolio score.`,
        working:
          strengths[0] ??
          'The portfolio has enough public material to start a useful assessment.',
        fixFirst:
          improvements[0] ??
          'Add clearer documentation, project outcomes, and recent maintenance signals.',
      },
      profileSummary:
        technologies.length > 0
          ? `${technologies.slice(0, 3).join(', ')} developer with a ${scores.overall}/100 portfolio signal`
          : `Developer portfolio with a ${scores.overall}/100 readiness signal`,
      flagshipProjects: rankedRepos.map((repo, index) => ({
        name: repo.name,
        reason:
          topEvidence[index]?.summary ??
          `${repo.name} has the strongest visible repository signal in this profile.`,
        url: repo.html_url,
        stars: repo.stargazers_count,
        technologies: this.unique(
          this.presentStrings([
            repo.language,
            ...(topEvidence[index]?.technologies ?? []),
          ]),
        ),
        improvements: topEvidence[index]?.nextActions?.length
          ? topEvidence[index].nextActions
          : [
              'Add outcome-focused README sections',
              'Document setup, tests, and deployment',
            ],
        evidenceIds: topEvidence[index] ? [topEvidence[index].id] : [],
      })),
      metricInsights: {
        activity: `Activity scored ${scores.activity}/100 based on recent public events, repository count, followers, and stars.`,
        quality: `Project quality scored ${scores.projectQuality}/100 based on visible repository completeness signals such as descriptions, recency, metadata, and documentation.`,
        stack: `Stack diversity scored ${scores.techStackDiversity}/100 with detected technologies including ${technologies.slice(0, 5).join(', ') || 'limited public language data'}.`,
        consistency: `Consistency scored ${scores.consistency}/100 from the spread of recent public GitHub events across weeks.`,
      },
      checklist: nextActions.slice(0, 5).map((action) => ({
        item: action.title,
        metricTag: action.metricTag,
        evidenceIds: action.evidenceIds,
      })),
      analysisMetadata: this.createMetadata(
        'github',
        'deterministic',
        GENERIC_MODEL,
        warnings.length ? 0.54 : 0.62,
        warnings,
      ),
      evidence: topEvidence,
      qualitySignals,
      sourceLimitations: warnings,
      nextActions,
      evidenceReferences: topEvidence.map((item) => item.id),
    };
  }

  private buildLinkedinFallback(
    data: LinkedinAnalysisRequest,
    evidence: EvidenceCard[],
    qualitySignals: QualitySignal[],
    warnings: string[],
  ): LinkedinAnalysisResponse {
    const headline = data.headline || data.title || 'Software Engineer';
    const target = data.targetRoles?.[0] ?? headline;
    const dimensions = this.linkedinDimensionScores(data);
    const experienceEdits = data.experience.map((experience) => ({
      role: experience.role,
      company: experience.company,
      improvements: [
        `Clarify the business outcome for "${experience.description || experience.role}" without inventing metrics.`,
        `Add the real scale, users, revenue, latency, cost, or reliability metric if available.`,
      ],
    }));

    return {
      summary: {
        text: warnings.length
          ? `This LinkedIn analysis is limited because the backend only received sparse profile evidence. Add the profile headline, about section, skills, and experience text for a more specific recruiter-visibility report.`
          : `${data.fullName} has enough supplied profile evidence for a baseline LinkedIn review. The strongest immediate opportunity is to make the headline and about section more outcome-oriented for ${target}.`,
        seniorityGuess: this.guessSeniority(data),
      },
      dimensions,
      recommendations: {
        headlines: [
          `${headline} | ${data.skills.slice(0, 3).join(' • ') || 'Software Engineering'} | Building measurable product outcomes`,
          `${target} focused on reliable systems, product impact, and clear engineering execution`,
        ],
        aboutSuggestions: {
          missing:
            'Specific outcomes, measurable scale, target role positioning, and a concise call to action.',
          rewritten: data.about
            ? `${data.about}\n\nTo strengthen this section, add the real product outcomes, scale, and collaboration context behind the work above.`
            : 'Add a short first-person summary that explains your target role, strongest technical domain, proof points, and the type of opportunities you want.',
        },
        experienceEdits,
      },
      missingKeywords: this.missingKeywordsForText(
        `${data.title} ${data.headline ?? ''} ${data.about} ${data.profileText ?? ''} ${data.skills.join(' ')}`,
        data.targetRoles?.join(' '),
      ),
      actionPlan: {
        thisWeek: [
          'Paste the full LinkedIn headline, about section, and experience text into structured analysis.',
          'Rewrite the headline around target role, core stack, and real impact.',
        ],
        next30Days: [
          'Add quantified outcomes to each recent role where the data is truthful.',
          'Add featured projects that support the target role.',
        ],
        next60Days: [
          'Publish or share technical work that reinforces the desired positioning.',
          'Ask collaborators for recommendations tied to specific project outcomes.',
        ],
      },
      sourceLimitations: warnings,
      nextActions: [
        {
          title: 'Supply full LinkedIn profile text',
          detail:
            'The URL endpoint does not scrape LinkedIn; profile text is needed for high-confidence analysis.',
          priority: 'high',
          metricTag: 'Evidence',
          effort: 'short',
          evidenceIds: evidence.map((item) => item.id),
        },
      ],
      analysisMetadata: this.createMetadata(
        'linkedin',
        'deterministic',
        GENERIC_MODEL,
        warnings.length ? 0.28 : 0.58,
        warnings,
      ),
      evidence,
      qualitySignals,
    };
  }

  private buildCvFallback(
    text: string,
    options: CvAnalysisOptions,
    cvEvidence: CvEvidence,
    warnings: string[],
  ): CvAnalysisResponse {
    const textForKeywords = `${text} ${options.targetRole ?? ''}`;
    const weakBullets = cvEvidence.weakBullets.slice(0, 4);
    const improvements = weakBullets.map((quote) => ({
      category: 'Impact' as const,
      quote,
      suggestion:
        'This reads like a responsibility. Rework it into an outcome-focused achievement with the real metric, scale, or user impact.',
      rewritten:
        'Delivered [specific outcome] by [specific technical action], measured by [real metric or scale].',
      evidenceIds: ['cv-weak-bullets'],
    }));

    return {
      summary: {
        professionalLikelihood: cvEvidence.isReadable
          ? this.estimateCvScore(text, cvEvidence)
          : 18,
        critique: cvEvidence.isReadable
          ? `The resume has readable content, but the strongest improvement area is making achievements more specific to ${options.targetRole ?? 'the target software engineering role'}. Add real metrics, scope, and technologies where truthful.`
          : 'The PDF text extraction returned too little readable resume content. This often happens with scanned PDFs or image-only resumes.',
      },
      improvements,
      missingKeywords: cvEvidence.isReadable
        ? this.missingKeywordsForText(textForKeywords, options.jobDescription)
        : [],
      sourceLimitations: warnings,
      nextActions: [
        {
          title: cvEvidence.isReadable
            ? 'Rewrite responsibility bullets as measured achievements'
            : 'Upload a text-based PDF resume',
          detail: cvEvidence.isReadable
            ? 'Use the exact weak bullets identified in the report and add truthful metrics or scope.'
            : 'Export the resume as a selectable-text PDF, then run the analysis again.',
          priority: 'high',
          metricTag: 'Clarity',
          effort: 'medium',
          evidenceIds: cvEvidence.evidence.map((item) => item.id),
        },
      ],
      analysisMetadata: this.createMetadata(
        'cv',
        'deterministic',
        GENERIC_MODEL,
        cvEvidence.isReadable ? 0.56 : 0.2,
        warnings,
      ),
      evidence: cvEvidence.evidence,
      qualitySignals: cvEvidence.qualitySignals,
    };
  }

  private rankGithubRepos(repos: GithubRepo[]): GithubRepo[] {
    return [...repos].sort((a, b) => {
      const sourceWeight = Number(!b.fork) - Number(!a.fork);
      if (sourceWeight !== 0) return sourceWeight;
      const starWeight = b.stargazers_count - a.stargazers_count;
      if (starWeight !== 0) return starWeight;
      const recencyWeight =
        new Date(b.pushed_at || b.updated_at).getTime() -
        new Date(a.pushed_at || a.updated_at).getTime();
      if (recencyWeight !== 0) return recencyWeight;
      return b.size - a.size;
    });
  }

  private repoToEvidenceCard(
    repo: GithubRepo,
    index: number,
    technologies: string[],
  ): EvidenceCard {
    return {
      id: `repo-${index}-${this.slugify(repo.name)}`,
      source: 'github',
      title: repo.name,
      summary:
        repo.description ??
        `${repo.name} is a public repository with ${repo.stargazers_count} stars and ${repo.language ?? 'unknown'} as its primary language.`,
      repoName: repo.name,
      url: repo.html_url,
      technologies: this.unique(
        this.presentStrings([repo.language, ...technologies]),
      ),
      signals: [
        repo.description
          ? 'Repository has a description'
          : 'No description found',
        repo.homepage
          ? 'Repository links to a homepage/demo'
          : 'No homepage/demo detected',
        repo.stargazers_count > 0
          ? `${repo.stargazers_count} public stars`
          : 'No public star signal yet',
      ],
      gaps: [
        repo.description ? '' : 'Add a clear repository description',
        repo.homepage ? '' : 'Add a demo or live project link when available',
      ].filter(Boolean),
      nextActions: [
        'Document setup, usage, architecture, and outcomes in the README',
        'Add visible quality signals such as tests, CI, screenshots, and deployment notes',
      ],
    };
  }

  private githubStrengths(
    scores: AiAnalysisScores,
    technologies: string[],
  ): string[] {
    const strengths: string[] = [];
    if (scores.activity >= 70) strengths.push('Strong public GitHub activity');
    if (scores.projectQuality >= 70)
      strengths.push('Visible project-quality signals');
    if (scores.techStackDiversity >= 70) {
      strengths.push(
        `Broad technology exposure: ${technologies.slice(0, 4).join(', ')}`,
      );
    }
    if (scores.consistency >= 70)
      strengths.push('Consistent recent contribution rhythm');
    return strengths.length
      ? strengths
      : ['Public portfolio has a usable analysis baseline'];
  }

  private githubImprovements(
    scores: AiAnalysisScores,
    evidence: EvidenceCard[],
  ): string[] {
    const improvements: string[] = [];
    if (scores.activity < 60)
      improvements.push('Increase recent visible GitHub activity');
    if (scores.projectQuality < 70) {
      improvements.push(
        'Improve documentation, tests, CI, and project presentation',
      );
    }
    if (scores.techStackDiversity < 60) {
      improvements.push(
        'Show either deeper specialization or broader production tooling',
      );
    }
    if (scores.consistency < 60) {
      improvements.push('Create a more consistent public contribution rhythm');
    }
    improvements.push(...evidence.flatMap((item) => item.gaps).slice(0, 3));
    return this.unique(improvements).slice(0, 6);
  }

  private githubNextActions(
    scores: AiAnalysisScores,
    evidence: EvidenceCard[],
  ): NextAction[] {
    const actions = evidence.flatMap((item) =>
      item.nextActions.slice(0, 2).map((action, index) => ({
        title: action,
        detail: `Apply this to ${item.title} first because it is one of the clearest visible portfolio signals.`,
        priority: index === 0 ? ('high' as const) : ('medium' as const),
        metricTag: scores.projectQuality < 70 ? 'Quality' : 'Positioning',
        effort: index === 0 ? ('medium' as const) : ('short' as const),
        evidenceIds: [item.id],
      })),
    );

    return actions.length
      ? actions.slice(0, 6)
      : [
          {
            title: 'Choose one flagship repository and make it recruiter-ready',
            detail:
              'Add a clear README, screenshots, setup steps, architecture notes, tests, and deployment link.',
            priority: 'high',
            metricTag: 'Quality',
            effort: 'medium',
            evidenceIds: evidence.map((item) => item.id).slice(0, 1),
          },
        ];
  }

  private githubCareerPath(
    scores: AiAnalysisScores,
    technologies: string[],
  ): string {
    if (
      technologies.some((tech) => /react|vue|angular|typescript/i.test(tech))
    ) {
      return `Frontend or full-stack engineering roles where ${technologies.slice(0, 3).join(', ')} experience can be turned into product-facing impact.`;
    }
    if (technologies.some((tech) => /python|go|java|node/i.test(tech))) {
      return 'Backend or platform engineering roles with stronger project documentation and production-readiness signals.';
    }
    return scores.overall >= 70
      ? 'Software engineering roles that value public project ownership and consistent delivery.'
      : 'Junior-to-mid software engineering roles after strengthening flagship project evidence.';
  }

  private isGithubOutputGrounded(
    output: AiAnalysisResponse,
    repos: GithubRepo[],
    evidence: EvidenceCard[],
  ): boolean {
    const serialized = JSON.stringify(output).toLowerCase();
    const evidenceIds = new Set(evidence.map((item) => item.id));
    const citedIds = [
      ...(output.evidenceReferences ?? []),
      ...output.flagshipProjects.flatMap((item) => item.evidenceIds ?? []),
      ...output.checklist.flatMap((item) => item.evidenceIds ?? []),
      ...(output.nextActions ?? []).flatMap((item) => item.evidenceIds),
    ];
    const citesEvidence = citedIds.some((id) => evidenceIds.has(id));
    const mentionsRepo = repos.some((repo) =>
      serialized.includes(repo.name.toLowerCase()),
    );
    const mentionsTechnology = evidence
      .flatMap((item) => item.technologies)
      .some((tech) => tech && serialized.includes(tech.toLowerCase()));

    return citesEvidence || mentionsRepo || mentionsTechnology;
  }

  private buildLinkedinEvidence(
    data: LinkedinAnalysisRequest,
    sourceLimitations: string[],
  ): EvidenceCard[] {
    const signals = [
      data.title || data.headline ? 'Headline/title supplied' : '',
      data.about ? 'About section supplied' : '',
      data.profileText ? 'Full profile text supplied' : '',
      data.experience.length
        ? `${data.experience.length} experience entries supplied`
        : '',
      data.skills.length ? `${data.skills.length} skills supplied` : '',
    ].filter(Boolean);

    return [
      {
        id: 'linkedin-profile-input',
        source: 'linkedin',
        title: data.fullName,
        summary: signals.length
          ? signals.join('; ')
          : 'Only a LinkedIn URL/profile slug was supplied.',
        repoName: null,
        url: null,
        technologies: data.skills,
        signals,
        gaps: sourceLimitations,
        nextActions: [
          'Supply full LinkedIn profile text for high-confidence analysis',
        ],
      },
    ];
  }

  private buildLinkedinQualitySignals(
    data: LinkedinAnalysisRequest,
  ): QualitySignal[] {
    return [
      {
        name: 'Profile Evidence',
        status: this.hasMeaningfulLinkedinEvidence(data) ? 'ok' : 'weak',
        evidence: data.profileText
          ? 'Full profile text supplied'
          : 'Analysis is based on structured fields only',
        score: this.hasMeaningfulLinkedinEvidence(data) ? 68 : 25,
      },
      {
        name: 'Skills Signal',
        status:
          data.skills.length >= 6
            ? 'strong'
            : data.skills.length
              ? 'ok'
              : 'weak',
        evidence: `${data.skills.length} skills supplied`,
        score: Math.min(100, data.skills.length * 12),
      },
    ];
  }

  private hasMeaningfulLinkedinEvidence(
    data: LinkedinAnalysisRequest,
  ): boolean {
    const profileTextLength = data.profileText?.trim().length ?? 0;
    const aboutLength = data.about?.trim().length ?? 0;
    const experienceTextLength = data.experience.reduce(
      (sum, item) => sum + (item.description?.trim().length ?? 0),
      0,
    );
    return (
      profileTextLength > 250 ||
      aboutLength > 120 ||
      experienceTextLength > 160 ||
      data.skills.length >= 5
    );
  }

  private linkedinDimensionScores(data: LinkedinAnalysisRequest) {
    const profileScore = Math.min(
      100,
      20 +
        Number(Boolean(data.title || data.headline)) * 20 +
        Number(Boolean(data.about)) * 20 +
        Number(data.experience.length > 0) * 20 +
        Number(data.skills.length > 0) * 20,
    );
    const headlineScore = Math.min(
      100,
      Math.max(data.title.length, data.headline?.length ?? 0) * 2,
    );
    const experienceScore = Math.min(
      100,
      data.experience.reduce(
        (sum, item) => sum + Math.min(35, item.description.length / 4),
        0,
      ),
    );
    const skillsScore = Math.min(100, data.skills.length * 10);
    const brandingScore = Math.min(
      100,
      (data.about.length + (data.profileText?.length ?? 0)) / 8,
    );
    const overall = Math.round(
      (profileScore +
        headlineScore +
        experienceScore +
        skillsScore +
        brandingScore) /
        5,
    );

    return {
      profile: this.dimension(profileScore, 'Profile completeness'),
      headline: this.dimension(headlineScore, 'Headline clarity'),
      experience: this.dimension(experienceScore, 'Experience evidence'),
      skills: this.dimension(skillsScore, 'Skills coverage'),
      branding: this.dimension(brandingScore, 'Personal positioning'),
      overall,
    };
  }

  private dimension(score: number, label: string) {
    const rounded = Math.round(score);
    return {
      score: rounded,
      status:
        rounded >= 80
          ? 'Strong'
          : rounded >= 60
            ? 'Good'
            : rounded >= 40
              ? 'Needs Work'
              : 'Limited Evidence',
      insights: [
        `${label} scored ${rounded}/100 based only on supplied profile fields.`,
      ],
    };
  }

  private sanitizeLinkedinOutput(
    output: LinkedinAnalysisResponse,
    data: LinkedinAnalysisRequest,
  ): LinkedinAnalysisResponse {
    const sourceText = JSON.stringify(data);
    const allowedCompanies = new Set(
      data.experience.map((item) => item.company.toLowerCase()),
    );
    const allowedRoles = new Set(
      data.experience.map((item) => item.role.toLowerCase()),
    );
    const sanitize = (value: string) =>
      this.replaceUnsupportedNumbers(value, sourceText);

    return {
      ...output,
      summary: {
        text: sanitize(output.summary.text),
        seniorityGuess: output.summary.seniorityGuess,
      },
      recommendations: {
        headlines: output.recommendations.headlines.map(sanitize),
        aboutSuggestions: {
          missing: sanitize(output.recommendations.aboutSuggestions.missing),
          rewritten: sanitize(
            output.recommendations.aboutSuggestions.rewritten,
          ),
        },
        experienceEdits: output.recommendations.experienceEdits
          .filter(
            (item) =>
              allowedCompanies.has(item.company.toLowerCase()) ||
              allowedRoles.has(item.role.toLowerCase()),
          )
          .map((item) => ({
            ...item,
            improvements: item.improvements.map(sanitize),
          })),
      },
      actionPlan: {
        thisWeek: output.actionPlan.thisWeek.map(sanitize),
        next30Days: output.actionPlan.next30Days.map(sanitize),
        next60Days: output.actionPlan.next60Days.map(sanitize),
      },
      nextActions: output.nextActions.map((action) => ({
        ...action,
        title: sanitize(action.title),
        detail: sanitize(action.detail),
      })),
    };
  }

  private replaceUnsupportedNumbers(value: string, sourceText: string): string {
    const allowed = new Set(
      sourceText.match(/\b\d+(?:\.\d+)?\s?[%+xKkMm]?\b/g) ?? [],
    );
    return value.replace(/\b\d+(?:\.\d+)?\s?[%+xKkMm]?\b/g, (token) =>
      allowed.has(token) ? token : 'measurable',
    );
  }

  private guessSeniority(data: LinkedinAnalysisRequest): string {
    const text =
      `${data.title} ${data.headline ?? ''} ${data.profileText ?? ''}`.toLowerCase();
    if (/staff|principal|lead|architect|manager/.test(text))
      return 'Lead/Staff';
    if (/senior|sr\./.test(text)) return 'Senior';
    if (/junior|intern|graduate/.test(text)) return 'Junior';
    return 'Mid-level';
  }

  private extractCvEvidence(
    text: string,
    options: CvAnalysisOptions,
  ): CvEvidence {
    const normalized = text.replace(/\r/g, '').trim();
    const words = normalized.split(/\s+/).filter(Boolean);
    const sections = this.extractSections(normalized);
    const weakBullets = normalized
      .split('\n')
      .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
      .filter((line) => line.length > 20)
      .filter((line) =>
        /responsible for|worked on|helped|assisted|various|maintained|participated/i.test(
          line,
        ),
      )
      .slice(0, 8);
    const detectedTechnologies = COMMON_SOFTWARE_KEYWORDS.filter((keyword) =>
      normalized.toLowerCase().includes(keyword.toLowerCase().replace('.', '')),
    );
    const evidence: EvidenceCard[] = [
      {
        id: 'cv-readable-text',
        source: 'cv',
        title: 'Extracted Resume Text',
        summary: `${normalized.length} characters and ${words.length} words extracted from the PDF.`,
        repoName: null,
        url: null,
        technologies: detectedTechnologies,
        signals: [
          `${Object.keys(sections).length} common resume sections detected`,
          `${detectedTechnologies.length} target technologies detected`,
          `${weakBullets.length} weak responsibility-style bullets detected`,
        ],
        gaps: weakBullets.length
          ? [
              'Some bullets read as responsibilities rather than measured achievements',
            ]
          : [],
        nextActions: [
          'Convert weak bullets into measurable, outcome-focused achievements',
        ],
      },
    ];

    if (weakBullets.length) {
      evidence.push({
        id: 'cv-weak-bullets',
        source: 'cv',
        title: 'Weak Bullet Candidates',
        summary: weakBullets.slice(0, 3).join(' | '),
        repoName: null,
        url: null,
        technologies: detectedTechnologies,
        signals: weakBullets,
        gaps: ['Responsibility-first wording weakens impact'],
        nextActions: [
          'Add real scope, outcome, and metric to each weak bullet',
        ],
      });
    }

    const sourceLimitations = [
      normalized.length > 30000
        ? 'CV text was truncated to the first 30,000 characters for AI analysis.'
        : '',
      options.jobDescription
        ? ''
        : 'No job description was supplied, so keyword analysis uses general software engineering signals.',
    ].filter(Boolean);

    return {
      sections,
      weakBullets,
      detectedTechnologies,
      evidence,
      qualitySignals: [
        {
          name: 'Readable Text',
          status: words.length >= 120 ? 'ok' : 'weak',
          evidence: `${words.length} words extracted`,
          score: Math.min(100, Math.round((words.length / 500) * 100)),
        },
        {
          name: 'Quantified Impact',
          status: /\d+[%+$]?/.test(normalized) ? 'ok' : 'weak',
          evidence: /\d+[%+$]?/.test(normalized)
            ? 'Some numeric evidence detected'
            : 'No clear metrics detected',
          score: /\d+[%+$]?/.test(normalized) ? 70 : 30,
        },
      ],
      sourceLimitations,
      isReadable: normalized.length >= 400 && words.length >= 70,
    };
  }

  private extractSections(text: string): Record<string, string> {
    const headings = [
      'summary',
      'profile',
      'skills',
      'technical skills',
      'experience',
      'work experience',
      'employment',
      'projects',
      'education',
      'certifications',
    ];
    const sections: Record<string, string> = {};
    const lines = text.split('\n');
    let current = 'body';

    for (const line of lines) {
      const cleaned = line.trim();
      const heading = headings.find(
        (item) =>
          cleaned.toLowerCase() === item ||
          cleaned.toLowerCase().startsWith(`${item}:`),
      );

      if (heading) {
        current = heading;
        sections[current] = '';
      } else if (cleaned) {
        sections[current] = `${sections[current] ?? ''}${cleaned}\n`;
      }
    }

    return Object.fromEntries(
      Object.entries(sections).map(([key, value]) => [
        key,
        this.truncate(value, 2500),
      ]),
    );
  }

  private ensureCvQuotesExist(
    output: CvAnalysisResponse,
    text: string,
    options: CvAnalysisOptions,
    cvEvidence: CvEvidence,
  ): { response: CvAnalysisResponse; warnings: string[] } {
    const warnings: string[] = [];
    const improvements = output.improvements.filter((item) =>
      text.includes(item.quote.trim()),
    );

    if (improvements.length !== output.improvements.length) {
      warnings.push(
        'Some AI CV improvements were removed because their quotes were not found in the extracted text.',
      );
    }

    if (improvements.length) {
      return {
        response: {
          ...output,
          improvements,
        },
        warnings,
      };
    }

    const fallback = this.buildCvFallback(text, options, cvEvidence, warnings);
    return { response: fallback, warnings };
  }

  private estimateCvScore(text: string, cvEvidence: CvEvidence): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    const sectionScore = Math.min(
      Object.keys(cvEvidence.sections).length * 12,
      36,
    );
    const lengthScore = Math.min(words / 8, 34);
    const metricScore = /\d+[%+$]?/.test(text) ? 20 : 6;
    const weakPenalty = Math.min(cvEvidence.weakBullets.length * 3, 18);
    return Math.max(
      20,
      Math.min(
        92,
        Math.round(sectionScore + lengthScore + metricScore - weakPenalty),
      ),
    );
  }

  private missingKeywordsForText(text: string, targetText?: string): string[] {
    const haystack = text.toLowerCase();
    const targetKeywords = this.unique([
      ...(targetText?.match(/\b[A-Z][A-Za-z+#./-]{2,}\b/g) ?? []),
      ...COMMON_SOFTWARE_KEYWORDS,
    ]);

    return targetKeywords
      .filter(
        (keyword) => !haystack.includes(keyword.toLowerCase().replace('.', '')),
      )
      .slice(0, 10);
  }

  private scoreLabel(score: number): string {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'solid';
    if (score >= 40) return 'developing';
    return 'early';
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  private unique<T>(values: T[]): T[] {
    return [...new Set(values.filter(Boolean))];
  }

  private presentStrings(values: Array<string | null | undefined>): string[] {
    return values.filter((value): value is string => Boolean(value));
  }
}
