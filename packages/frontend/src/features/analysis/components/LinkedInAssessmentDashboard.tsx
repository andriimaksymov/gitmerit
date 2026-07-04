import { ArrowRight, CheckCircle2, Linkedin, Sparkles } from 'lucide-react';
import { DashboardShell } from '@/components/shared/DashboardShell';
import { ScoreRing } from '@/components/shared/ScoreRing';
import type {
  LinkedinProfileAssessment,
  LinkedinSectionResult,
  LinkedinSectionStatus,
} from '@gitmerit/shared';

const STATUS_STYLES: Record<LinkedinSectionStatus, { label: string; pill: string; ring: string }> =
  {
    strong: {
      label: 'Strong',
      pill: 'bg-emerald-50 text-emerald-700',
      ring: '#10b981',
    },
    ok: { label: 'OK', pill: 'bg-sky-50 text-sky-700', ring: '#0ea5e9' },
    weak: { label: 'Needs work', pill: 'bg-amber-50 text-amber-700', ring: '#f59e0b' },
    missing: { label: 'Missing', pill: 'bg-red-50 text-red-700', ring: '#ef4444' },
  };

function SectionCard({ section }: { section: LinkedinSectionResult }) {
  const style = STATUS_STYLES[section.status];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-950">{section.label}</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${style.pill}`}>
            {style.label}
          </span>
        </div>
        <span className="text-2xl font-bold text-slate-950">
          {Math.round(section.score)}
          <span className="text-sm font-medium text-slate-400">/100</span>
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Current state */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Current</p>
          <p className="text-sm leading-relaxed text-slate-700">{section.currentState}</p>
        </div>

        {/* Recommended state */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Recommended
          </p>
          <p className="text-sm leading-relaxed text-slate-800">{section.recommendation}</p>
          {section.actions.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {section.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-violet-500" />
                  {action}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkedInAssessmentDashboard({
  assessment,
}: {
  assessment: LinkedinProfileAssessment;
}) {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Linkedin className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  {assessment.name}
                </h1>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  Target role
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="font-semibold text-slate-700">{assessment.targetTitle}</span>
                </p>
              </div>
            </div>
            <ScoreRing
              score={assessment.overallScore}
              label="Profile Score"
              color="#2563eb"
              size="lg"
            />
          </div>
          <p className="mt-5 text-base leading-relaxed text-slate-600">{assessment.summary}</p>
        </section>

        {/* Sections */}
        {assessment.sections.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            No profile sections could be detected in this PDF. Export the full profile from LinkedIn
            (Profile → More → Save to PDF) and upload it again.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {assessment.sections.map((section) => (
              <SectionCard key={section.key} section={section} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
