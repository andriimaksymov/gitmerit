import { Controller, Post, Body } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzePortfolioDto } from './dto/analyze-portfolio.dto';

@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('analyze')
  async analyzePortfolio(@Body() analyzeDto: AnalyzePortfolioDto) {
    return this.analysisService.analyzePortfolio(analyzeDto.username);
  }
}
