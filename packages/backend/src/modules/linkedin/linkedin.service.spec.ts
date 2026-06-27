import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai/ai.service';
import { LinkedinService } from './linkedin.service';
import { LinkedinScraper } from './linkedin.scraper';

describe('LinkedinService', () => {
  let service: LinkedinService;
  let aiService: { generateLinkedinAnalysis: jest.Mock };

  beforeEach(async () => {
    aiService = {
      generateLinkedinAnalysis: jest.fn().mockResolvedValue({
        summary: { text: 'Limited analysis', seniorityGuess: 'Unknown' },
        dimensions: {
          overall: 20,
          profile: { score: 20, status: 'Limited Evidence', insights: [] },
          headline: { score: 0, status: 'Limited Evidence', insights: [] },
          experience: { score: 0, status: 'Limited Evidence', insights: [] },
          skills: { score: 0, status: 'Limited Evidence', insights: [] },
          branding: { score: 0, status: 'Limited Evidence', insights: [] },
        },
        recommendations: {
          headlines: [],
          aboutSuggestions: { missing: '', rewritten: '' },
          experienceEdits: [],
        },
        missingKeywords: [],
        actionPlan: { thisWeek: [], next30Days: [], next60Days: [] },
        sourceLimitations: ['limited'],
        nextActions: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkedinService,
        LinkedinScraper,
        {
          provide: AiService,
          useValue: aiService,
        },
      ],
    }).compile();

    service = module.get<LinkedinService>(LinkedinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('marks URL-only analysis as limited evidence', async () => {
    const result = await service.analyzeProfileFromUrl(
      'https://www.linkedin.com/in/sample-person',
    );

    expect(result.profile.fullName).toBe('Sample Person');
    expect(result.profile.experience).toEqual([]);
    expect(aiService.generateLinkedinAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '',
        about: '',
        skills: [],
      }),
      expect.objectContaining({
        limitedEvidence: true,
      }),
    );
  });
});
