import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai/ai.service';
import { LinkedinService } from './linkedin.service';

describe('LinkedinService', () => {
  let service: LinkedinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkedinService,
        {
          provide: AiService,
          useValue: {
            generateLinkedinAnalysis: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LinkedinService>(LinkedinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
