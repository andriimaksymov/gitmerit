import { Test, TestingModule } from '@nestjs/testing';
import { LinkedinController } from './linkedin.controller';
import { LinkedinService } from './linkedin.service';

describe('LinkedinController', () => {
  let controller: LinkedinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkedinController],
      providers: [
        {
          provide: LinkedinService,
          useValue: {
            analyzeProfileFromUrl: jest.fn(),
            analyzeProfile: jest.fn(),
            fetchProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LinkedinController>(LinkedinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
