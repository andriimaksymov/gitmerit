import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzePortfolioDto } from './dto/analyze-portfolio.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('analyze')
  async analyzePortfolio(@Body() analyzeDto: AnalyzePortfolioDto) {
    return this.analysisService.analyzePortfolio(analyzeDto.username);
  }

  @Get(':id')
  getAnalysis(@Param('id') id: string) {
    // TODO: Implement when database is added
    return {
      message:
        'Analysis retrieval will be implemented with database integration',
      id,
    };
  }
}
