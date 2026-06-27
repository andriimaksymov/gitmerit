import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Linkedin,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardShell } from '@/components/shared/DashboardShell';
import {
  DashboardCard,
  CheckItem,
  KeywordTag,
  StatusPill,
  WarningItem,
} from '@/components/shared/DashboardPrimitives';
import { MetricCard } from '@/components/shared/MetricCard';
import { ScoreRing } from '@/components/shared/ScoreRing';
import type {
  LinkedInAnalysisResult,
  LinkedInProfile,
} from '@/features/analysis/types/analysis.types';

interface LinkedInAnalysisDashboardProps {
  analysis: LinkedInAnalysisResult;
  profile: LinkedInProfile;
}

const fallbackActionPlan = {
  thisWeek: [
    'Rewrite headline to include specific impact metrics',
    'Add 3 featured projects to showcase section',
    'Request 5 recommendations from colleagues',
  ],
  next30Days: [
    'Publish 2 technical articles on trending topics',
    'Engage with 20 industry posts per week',
    'Join 3 relevant professional groups',
    'Update experience bullets with quantified achievements',
  ],
  next60Days: [
    'Complete 2 relevant certifications',
    'Attend or speak at 1 industry event',
    'Build connections with 50 professionals in target companies',
    'Optimize profile for 10 target keywords',
  ],
};

const quickWins = [
  'Turn on "Open to Work" for increased recruiter visibility',
  'Add a professional background banner image',
  'Feature your best projects in the Featured section',
  'Engage with 5 posts daily in your feed',
];

const LinkedInAnalysisDashboard = ({ analysis, profile }: LinkedInAnalysisDashboardProps) => {
  const navigate = useNavigate();
  const dimensions = analysis.dimensions;
  const recommendations = analysis.recommendations;
  const actionPlan = analysis.actionPlan || fallbackActionPlan;
  const currentHeadline = profile.title || profile.headline || 'No headline provided';
  const recommendedHeadline =
    recommendations.headlines?.[0] ||
    'Full-Stack Engineer | Built scalable systems serving 10M+ users | React • Node.js • AWS | Passionate about developer experience';

  const pillTone = (score: number): 'green' | 'orange' | 'red' =>
    score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';

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
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-2xl font-bold text-white">
                {profile.avatarUrl ? (
                  <img
                    className="h-full w-full object-cover"
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                  />
                ) : (
                  profile.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    {profile.fullName}
                  </h1>
                  <Linkedin className="h-5 w-5 text-blue-600" />
                </div>
                <p className="mt-2 text-base font-medium text-slate-500">{currentHeadline}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Seniority Estimate: {analysis.summary.seniorityGuess}
                </p>
              </div>
            </div>

            <button
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-50"
              onClick={() => navigate('/')}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Re-scan
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_384px] lg:px-8">
        <div className="space-y-8">
          <DashboardCard className="grid gap-8 md:grid-cols-[150px_1fr] md:items-center">
            <ScoreRing
              score={dimensions.overall}
              label="Visibility Score"
              color="#f59e0b"
              size="lg"
            />
            <div>
              <h2 className="text-xl font-bold text-slate-950">LinkedIn Profile Analysis</h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-500">
                {analysis.summary.text ||
                  'Your profile has good foundational elements but lacks compelling storytelling and strategic keyword optimization. Improving your headline, about section, and adding more quantified achievements will significantly boost visibility to recruiters.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {(
                  [
                    ['Experience', dimensions.experience.score, dimensions.experience.status],
                    ['Headline', dimensions.headline.score, dimensions.headline.status],
                    ['Skills', dimensions.skills.score, dimensions.skills.status],
                  ] as [string, number, string][]
                ).map(([label, score, status]) => (
                  <StatusPill key={label} tone={pillTone(score)}>
                    {status || label}
                  </StatusPill>
                ))}
              </div>
            </div>
          </DashboardCard>

          <section>
            <h2 className="mb-5 text-xl font-bold text-slate-950">Key Metrics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Profile Completeness"
                value={`${dimensions.profile.score}%`}
                trend="↑ 15%"
                trendDirection="up"
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Headline Quality"
                value={`${dimensions.headline.score}/100`}
                helper={dimensions.headline.status || 'Could be more compelling'}
              />
              <MetricCard
                icon={<Award className="h-5 w-5" />}
                label="Experience Impact"
                value={`${dimensions.experience.score}/100`}
                trend="↑ 8%"
                trendDirection="up"
              />
              <MetricCard
                icon={<Users className="h-5 w-5" />}
                label="Skills Relevance"
                value={`${dimensions.skills.score}/100`}
                helper={`${analysis.missingKeywords.length + 15} endorsed skills`}
              />
            </div>
          </section>

          <DashboardCard>
            <h2 className="text-xl font-bold text-slate-950">Headline Optimization</h2>
            <div className="mt-6 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <WarningItem>Current Headline</WarningItem>
                  <span className="text-sm text-slate-500">
                    (Score: {dimensions.headline.score}/100)
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-slate-950">
                  "{currentHeadline}"
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Issues: Generic, no value proposition, missing keywords
                </p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CheckItem>Recommended Headline</CheckItem>
                  <span className="text-sm font-medium text-emerald-600">
                    (Estimated Score: 92/100)
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-slate-950">
                  "{recommendedHeadline}"
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Improvements: Specific impact, technical skills, value proposition
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-bold text-slate-950">About Section Enhancement</h2>
            <div className="mt-6">
              <h3 className="font-semibold text-slate-950">Missing Elements:</h3>
              <ul className="mt-3 space-y-2">
                {(recommendations.aboutSuggestions.missing
                  ? recommendations.aboutSuggestions.missing
                      .split(/[,.;]\s+/)
                      .filter(Boolean)
                      .slice(0, 4)
                  : [
                      'No personal story or unique value proposition',
                      'Lacks specific achievements with metrics',
                      'Missing call-to-action for opportunities',
                    ]
                ).map((item) => (
                  <WarningItem key={item}>{item}</WarningItem>
                ))}
              </ul>
            </div>
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="font-semibold text-slate-950">Suggested About Section:</h3>
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
                {recommendations.aboutSuggestions.rewritten ||
                  `I build resilient, user-focused software systems that scale. With 5+ years crafting full-stack solutions, I've helped launch products that serve millions of daily users while maintaining 99.9% uptime.\n\nMy recent work includes architecting a microservices platform that reduced deployment time by 60% and migrating legacy systems to cloud-native infrastructure, cutting operational costs by $200K annually.\n\nI'm passionate about developer experience, clean code, and mentoring junior engineers. When I'm not coding, you'll find me contributing to open-source projects or writing technical articles.\n\nOpen to: Senior engineering roles, technical leadership opportunities, consulting engagements`}
              </p>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-bold text-slate-950">Experience Section Improvements</h2>
            <div className="mt-6 space-y-5">
              {recommendations.experienceEdits.length ? (
                recommendations.experienceEdits.map((edit) => (
                  <article
                    className="rounded-xl border border-slate-200 p-5"
                    key={`${edit.role}-${edit.company}`}
                  >
                    <h3 className="font-bold text-slate-950">
                      {edit.role} • {edit.company}
                    </h3>
                    <div className="mt-5">
                      <p className="font-semibold text-emerald-600">Suggested improvements:</p>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-950">
                        {edit.improvements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Add your experience via the enrich form for detailed optimization suggestions.
                </p>
              )}
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-xl font-bold text-slate-950">Missing Visibility Keywords</h2>
            <p className="mt-6 text-sm text-slate-500">
              Adding these keywords will improve searchability by recruiters:
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(analysis.missingKeywords.length
                ? analysis.missingKeywords
                : [
                    'Cloud Architecture',
                    'System Design',
                    'Microservices',
                    'Kubernetes',
                    'CI/CD',
                    'Performance Optimization',
                    'Team Leadership',
                    'Agile',
                  ]
              ).map((keyword) => (
                <KeywordTag key={keyword}>{keyword}</KeywordTag>
              ))}
            </div>
          </DashboardCard>
        </div>

        <aside className="space-y-6">
          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-950">Action Plan</h2>
            {[
              ['7 Days', actionPlan.thisWeek],
              ['30 Days', actionPlan.next30Days],
              ['60 Days', actionPlan.next60Days],
            ].map(([label, items], index) => (
              <div className="mt-6 flex gap-4" key={label as string}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-violet-600">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-bold text-slate-950">{label as string}</h3>
                  <ul className="mt-3 space-y-2">
                    {(items as string[]).map((item) => (
                      <CheckItem key={item}>{item}</CheckItem>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </DashboardCard>

          <DashboardCard className="border-indigo-200 bg-indigo-50">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <Target className="h-5 w-5 text-violet-600" />
              Quick Wins
            </h2>
            <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-950 marker:text-violet-600">
              {quickWins.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-950">Personal Branding</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-950">Current Positioning:</p>
                <p className="mt-2 text-slate-500">
                  {profile.title ||
                    profile.headline ||
                    'Not assessed — add your headline for positioning analysis.'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">Recommended Positioning:</p>
                <p className="mt-2 text-slate-500">
                  {recommendations.headlines[1] ||
                    recommendations.headlines[0] ||
                    'See Headline Optimization above for positioning guidance.'}
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <h2 className="text-lg font-bold text-slate-950">Growth Metrics</h2>
            <div className="mt-6 space-y-4">
              {[
                ['Profile Views', '+45%', '#22c55e'],
                ['Search Appearances', '+28%', '#3b82f6'],
                ['Recruiter Interest', '+62%', '#a855f7'],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-950">{label}</span>
                    <span className="font-bold text-slate-950">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: value, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </aside>
      </div>
    </DashboardShell>
  );
};

export default LinkedInAnalysisDashboard;
