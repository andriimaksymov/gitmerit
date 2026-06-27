import pdf from 'pdf-parse';
import { CvService } from './cv.service';
import { AiService } from '../ai/ai.service';

jest.mock('pdf-parse', () => jest.fn());

const mockedPdf = pdf as unknown as jest.Mock;

describe('CvService', () => {
  let service: CvService;
  let generateCvAnalysis: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    generateCvAnalysis = jest.fn().mockResolvedValue({ score: 80 });
    const aiService = { generateCvAnalysis } as unknown as AiService;
    service = new CvService(aiService);
  });

  it('extracts text and forwards it (with options) to the AI service', async () => {
    mockedPdf.mockResolvedValue({ text: 'resume text' });
    const buffer = Buffer.from('%PDF-1.4');
    const options = { targetRole: 'Frontend', seniority: 'Senior' };

    const result = await service.processCv(buffer, options);

    expect(mockedPdf).toHaveBeenCalledWith(buffer);
    expect(generateCvAnalysis).toHaveBeenCalledWith('resume text', options);
    expect(result).toEqual({
      fullText: 'resume text',
      analysis: { score: 80 },
    });
  });

  it('propagates a controlled error when PDF parsing fails', async () => {
    mockedPdf.mockRejectedValue(new Error('corrupt pdf'));
    await expect(service.processCv(Buffer.from('bad'))).rejects.toThrow(
      'corrupt pdf',
    );
    expect(generateCvAnalysis).not.toHaveBeenCalled();
  });
});
