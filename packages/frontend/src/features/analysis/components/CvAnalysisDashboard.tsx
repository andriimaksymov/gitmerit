import { ArrowLeft, Download, Eye, FileText, Target, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardShell } from '@/components/shared/DashboardShell';
import {
  DashboardCard,
  CheckItem,
  KeywordTag,
  StatusPill,
} from '@/components/shared/DashboardPrimitives';
import { MetricCard } from '@/components/shared/MetricCard';
import { ScoreRing } from '@/components/shared/ScoreRing';
import type { CvAnalysisResult } from '@/features/analysis/types/analysis.types';

interface CvAnalysisDashboardProps {
  analysis: CvAnalysisResult;
  text: string;
  fileName?: string;
}

const fallbackImprovements = [
  {
    category: 'Impact',
    quote: 'Responsible for developing new features for the web application',
    suggestion: 'Passive voice, no quantified impact',
    rewritten:
      'Developed 12+ customer-facing features that increased user engagement by 35% and reduced churn by 18%',
  },
  {
    category: 'Impact',
    quote: 'Worked on improving application performance',
    suggestion: 'Vague, no specific metrics or outcomes',
    rewritten:
      'Optimized database queries and API endpoints, reducing average page load time from 3.2s to 0.8s, improving Core Web Vitals scores by 40%',
  },
  {
    category: 'Clarity',
    quote: 'Collaborated with team members on various projects',
    suggestion: 'Too generic, unclear contribution',
    rewritten:
      'Led cross-functional team of 6 engineers and designers to deliver e-commerce checkout redesign, increasing conversion rate by 22%',
  },
  {
    category: 'Formatting',
    quote: 'Inconsistent date formats (Jan 2020, 03/2021, 2022)',
    suggestion: 'Unprofessional appearance',
    rewritten: 'Use consistent format: "Jan 2020 - Mar 2021"',
  },
  {
    category: 'Skills',
    quote: 'Skills listed without context or proficiency levels',
    suggestion: 'Impossible to gauge actual expertise',
    rewritten:
      'Organize by category (Languages, Frameworks, Tools) and optionally add proficiency: "Expert: JavaScript, React | Proficient: Python, Django"',
  },
];

const checklist = [
  'Add quantified metrics to every achievement',
  'Replace passive voice with action verbs',
  'Standardize date and formatting',
  'Integrate missing ATS keywords naturally',
  'Remove generic filler statements',
  'Lead with strongest achievements',
];

const sampleResume = `SAMPLE CANDIDATE
City, Country | contact details available on request

EXPERIENCE

Senior Software Engineer | Example Company | Jan 2020 - Present

• Responsible for developing new features for the web application
• Worked on improving application performance
• Collaborated with team members on various projects

SKILLS
JavaScript, React, Node.js, Python, SQL, Git`;

const categoryIcon = {
  Impact: TrendingUp,
  Clarity: Eye,
  Formatting: FileText,
  Skills: Zap,
};

const CvAnalysisDashboard = ({ analysis, text, fileName }: CvAnalysisDashboardProps) => {
  const navigate = useNavigate();
  const score = analysis.summary.professionalLikelihood || 0;
  const improvements = analysis.improvements.length ? analysis.improvements : fallbackImprovements;
  const categories = Array.from(new Set(improvements.map((item) => item.category)));
  const scannedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const atsScore = Math.max(42, Math.min(92, 92 - analysis.missingKeywords.length * 3));

  return (
    <DashboardShell>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
            onClick={() => navigate('/')}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  {fileName || 'Resume Scanner'}
                </h1>
                <p className="mt-2 text-base text-slate-500">Scanned on {scannedDate}</p>
              </div>
            </div>

            <button
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
              type="button"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_384px] lg:px-8">
        <div className="space-y-8">
          <DashboardCard className="grid gap-8 md:grid-cols-[150px_1fr] md:items-center">
            <ScoreRing score={score} label="Professional Score" color="#f59e0b" size="lg" />
            <div>
              <h2 className="text-xl font-bold text-slate-950">Executive Summary</h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-500">
                {analysis.summary.critique ||
                  'Your resume demonstrates relevant technical experience but lacks impact-driven storytelling. Key improvements include quantifying achievements with specific metrics, using active voice consistently, and optimizing for ATS keyword matching.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <StatusPill>Relevant Experience</StatusPill>
                <StatusPill tone="orange">Weak Metrics</StatusPill>
                <StatusPill tone="orange">Generic Language</StatusPill>
              </div>
            </div>
          </DashboardCard>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={<Target className="h-5 w-5 text-red-600" />}
              label="Critical Issues Found"
              value={`${Math.max(improvements.length, analysis.missingKeywords.length)}`}
            />
            <MetricCard
              icon={<Target className="h-5 w-5 text-orange-600" />}
              label="ATS Compatibility"
              value={`${atsScore}%`}
            />
            <MetricCard
              icon={<Eye className="h-5 w-5 text-emerald-600" />}
              label="Visual Layout"
              value="Good"
            />
          </div>

          {categories.map((category) => {
            const Icon = categoryIcon[category as keyof typeof categoryIcon] || FileText;
            const categoryItems = improvements.filter((item) => item.category === category);

            return (
              <DashboardCard key={category}>
                <h2 className="flex items-center gap-3 text-xl font-bold text-slate-950">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  {category} Improvements
                </h2>
                <div className="mt-6 space-y-6 border-l-4 border-orange-300 pl-5">
                  {categoryItems.map((item, index) => (
                    <article className="space-y-3" key={`${item.category}-${item.quote}-${index}`}>
                      <p className="text-xs font-bold uppercase text-slate-500">Current</p>
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-slate-950">
                        {item.quote}
                      </div>
                      <p className="text-xs font-bold uppercase text-orange-600">Issue</p>
                      <p className="text-sm text-slate-500">{item.suggestion}</p>
                      <p className="text-xs font-bold uppercase text-slate-500">Improved</p>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-slate-950">
                        {item.rewritten}
                      </div>
                    </article>
                  ))}
                </div>
              </DashboardCard>
            );
          })}

          <DashboardCard>
            <h2 className="text-xl font-bold text-slate-950">Missing ATS Keywords</h2>
            <p className="mt-6 text-sm text-slate-500">
              These keywords commonly appear in software engineering job descriptions but are
              missing from your resume:
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(analysis.missingKeywords.length
                ? analysis.missingKeywords
                : [
                    'Microservices',
                    'RESTful APIs',
                    'GraphQL',
                    'CI/CD',
                    'Docker',
                    'Kubernetes',
                    'Test-Driven Development',
                    'Agile',
                    'System Design',
                    'Code Review',
                    'Performance Optimization',
                    'Cloud Architecture',
                  ]
              ).map((keyword) => (
                <KeywordTag key={keyword}>{keyword}</KeywordTag>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Tip: Integrate these naturally into your experience bullets where truthful and
              relevant
            </p>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-bold text-slate-950">Resume Text Preview</h2>
            <pre className="mt-6 max-h-[420px] overflow-auto rounded-xl bg-slate-100 p-6 font-mono text-sm leading-7 text-slate-950 whitespace-pre-wrap">
              {text || sampleResume}
            </pre>
          </DashboardCard>
        </div>

        <aside className="space-y-6">
          <DashboardCard className="border-indigo-200 bg-indigo-50">
            <h2 className="text-lg font-bold text-slate-950">Quick Action Checklist</h2>
            <ul className="mt-5 space-y-2">
              {checklist.map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </ul>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-950">Strength Distribution</h2>
            <div className="mt-6 space-y-5">
              {[
                ['Technical Skills', Math.max(72, score + 6), '#22c55e'],
                ['Quantified Impact', Math.max(35, score - 31), '#f97316'],
                ['Formatting', Math.max(60, score - 5), '#3b82f6'],
                ['Keyword Optimization', atsScore, '#a855f7'],
              ].map(([label, value, color]) => (
                <div key={label as string}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-950">{label as string}</span>
                    <span className="font-bold text-slate-950">{value as number}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${value}%`, backgroundColor: color as string }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-950">Estimated Impact</h2>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="font-bold text-slate-950">+40-60% interview rate</p>
                  <p className="text-sm text-slate-500">After implementing all suggestions</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Target className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-bold text-slate-950">85-90% ATS pass rate</p>
                  <p className="text-sm text-slate-500">With keyword optimization</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Zap className="mt-0.5 h-4 w-4 text-violet-600" />
                <div>
                  <p className="font-bold text-slate-950">2-3x recruiter engagement</p>
                  <p className="text-sm text-slate-500">With impact-driven language</p>
                </div>
              </li>
            </ul>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-950">Top Priority</h2>
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-bold text-slate-950">Add Quantified Metrics</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                This single change will have the biggest impact on your resume's effectiveness.
                Review every bullet point and ask: "What measurable result did I achieve?"
              </p>
            </div>
          </DashboardCard>
        </aside>
      </div>
    </DashboardShell>
  );
};

export default CvAnalysisDashboard;
