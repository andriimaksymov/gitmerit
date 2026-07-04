import LinkedInAssessmentDashboard from '../features/analysis/components/LinkedInAssessmentDashboard';
import { useFileAnalysis } from '@/features/analysis/hooks/useFileAnalysis';
import { usePendingFile } from '@/features/analysis/hooks/usePendingFile';
import { AnalysisError, AnalysisPending, ReuploadPrompt } from '@/components/shared/AnalysisStatus';
import { ShareReportBar } from '@/components/shared/ShareReportBar';
import type { LinkedinProfileAssessment } from '@gitmerit/shared';

/** API response: the assessment plus the persisted report id (when enabled). */
type LinkedinAnalysisResponse = LinkedinProfileAssessment & {
  reportId?: string | null;
};

export default function LinkedinAnalysisPage() {
  const [file, setFile] = usePendingFile();
  const { data, isPending, isError, error, refetch } = useFileAnalysis<LinkedinAnalysisResponse>(
    '/linkedin/analyze-pdf',
    file
  );

  if (!file) {
    return (
      <ReuploadPrompt
        title="Upload your LinkedIn PDF"
        detail="Your file is no longer available (files do not survive a page refresh). Export your profile from LinkedIn (Profile → More → Save to PDF) and upload it again."
        onFile={setFile}
      />
    );
  }

  if (isPending || !data) {
    if (isError) {
      return (
        <AnalysisError
          title="Analysis failed"
          message={
            error instanceof Error
              ? error.message
              : 'We could not read that LinkedIn PDF. Please try exporting it again.'
          }
          onRetry={() => refetch()}
        />
      );
    }
    return (
      <AnalysisPending
        title="Analyzing your profile..."
        detail="Scoring each section against your target role"
      />
    );
  }

  return (
    <>
      <ShareReportBar reportId={data.reportId} />
      <LinkedInAssessmentDashboard assessment={data} />
    </>
  );
}
