import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AnalysisSource } from '@gitmerit/shared';
import { PrismaService } from './prisma.service';

export interface ReportSummary {
  id: string;
  source: AnalysisSource;
  subject: string;
  overallScore: number | null;
  createdAt: string;
}

export interface StoredReport extends ReportSummary {
  payload: unknown;
}

const LIST_LIMIT = 50;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  get enabled(): boolean {
    return this.prisma.enabled;
  }

  /**
   * Best-effort persistence: analysis responses must never fail because the
   * history database is down, so errors are logged and swallowed. Returns the
   * shareable report id, or null when history is disabled/unavailable.
   */
  async save(
    source: AnalysisSource,
    subject: string,
    payload: unknown,
    overallScore?: number,
  ): Promise<string | null> {
    if (!this.prisma.enabled) return null;
    try {
      const report = await this.prisma.db.report.create({
        data: {
          source,
          subject,
          overallScore:
            typeof overallScore === 'number' ? Math.round(overallScore) : null,
          payload: payload as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      return report.id;
    } catch (error) {
      this.logger.error(
        `Failed to persist ${source} report for "${subject}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async list(): Promise<ReportSummary[]> {
    const reports = await this.prisma.db.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        source: true,
        subject: true,
        overallScore: true,
        createdAt: true,
      },
    });
    return reports.map((report) => ({
      ...report,
      source: report.source as AnalysisSource,
      createdAt: report.createdAt.toISOString(),
    }));
  }

  async get(id: string): Promise<StoredReport> {
    const report = await this.prisma.db.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return {
      id: report.id,
      source: report.source as AnalysisSource,
      subject: report.subject,
      overallScore: report.overallScore,
      payload: report.payload,
      createdAt: report.createdAt.toISOString(),
    };
  }
}
