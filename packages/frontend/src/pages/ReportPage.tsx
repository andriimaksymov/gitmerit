import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReport } from '@/features/analysis/api/reportsApi';
import GitHubAnalysisDashboard from '@/features/analysis/components/GitHubAnalysisDashboard';
import CvAnalysisDashboard from '@/features/analysis/components/CvAnalysisDashboard';
import LinkedInAssessmentDashboard from '@/features/analysis/components/LinkedInAssessmentDashboard';
import { AnalysisError, AnalysisPending } from '@/components/shared/AnalysisStatus';
import type { AnalysisResult, CvUploadResponse } from '@/features/analysis/types/analysis.types';
import type { LinkedinProfileAssessment } from '@gitmerit/shared';

/**
 * Read-only view of a persisted analysis: /report/:id. Renders the same
 * dashboard the user saw when the analysis ran, from the stored snapshot.
 */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: report,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id!),
    enabled: Boolean(id),
    staleTime: Infinity, // snapshots are immutable
  });

  if (isPending) {
    return <AnalysisPending title="Loading report..." detail="Fetching the saved analysis" />;
  }

  if (isError || !report) {
    return (
      <AnalysisError
        title="Report not found"
        message={
          error instanceof Error
            ? error.message
            : 'This report does not exist or is no longer available.'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  if (report.source === 'github') {
    return <GitHubAnalysisDashboard analysis={report.payload as AnalysisResult} />;
  }

  if (report.source === 'cv') {
    const payload = report.payload as CvUploadResponse;
    return (
      <CvAnalysisDashboard
        analysis={payload.analysis}
        text={payload.fullText}
        fileName={report.subject}
      />
    );
  }

  return <LinkedInAssessmentDashboard assessment={report.payload as LinkedinProfileAssessment} />;
}
