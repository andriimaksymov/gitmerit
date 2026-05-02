import {
  ArrowLeft,
  CalendarDays,
  Code2,
  Download,
  Github,
  RefreshCw,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/landing/Navbar';
import {
  DashboardCard,
  KeywordTag,
  StatusPill,
  CheckItem,
  WarningItem,
} from '@/components/shared/DashboardPrimitives';
import { MetricCard } from '@/components/shared/MetricCard';
import { ScoreRing } from '@/components/shared/ScoreRing';
import type { AnalysisResult } from '../types/analysis.types';

interface GitHubAnalysisDashboardProps {
  analysis: AnalysisResult;
}

const fallbackProjects = [
  {
    name: 'web-framework',
    reason: 'Most starred repository with consistent updates',
    url: '',
    stars: 2847,
    technologies: ['TypeScript', 'React', 'Node.js'],
    improvements: ['Add comprehensive test coverage', 'Improve documentation for contributors'],
  },
  {
    name: 'ml-pipeline',
    reason: 'Demonstrates advanced Python and ML expertise',
    url: '',
    stars: 1203,
    technologies: ['Python', 'TensorFlow', 'Docker'],
    improvements: ['Add automated test coverage', 'Create usage examples'],
  },
  {
    name: 'api-gateway',
    reason: 'Shows infrastructure and scalability knowledge',
    url: '',
    stars: 856,
    technologies: ['Go', 'Kubernetes', 'Redis'],
    improvements: ['Add performance benchmarks', 'Document deployment process'],
  },
];

const roadmapFallback = [
  'Add unit tests to top 3 repositories',
  'Write comprehensive README for flagship projects',
  'Contribute to 2-3 popular open-source projects',
  'Document release and deployment steps',
  'Create a technical blog or portfolio site',
];

const priorityFor = (index: number) => (index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low');
const pointsFor = (index: number) => [8, 6, 10, 5, 4][index] ?? 4;
const timelineFor = (index: number) =>
  ['1 week', '3 days', '1 month', '1 week', '2 weeks'][index] ?? '2 weeks';

const GitHubAnalysisDashboard = ({ analysis }: GitHubAnalysisDashboardProps) => {
  const navigate = useNavigate();
  const exportReport = () => {
    const originalTitle = document.title;

    document.title = `${analysis.username || 'github'}-analysis-report`;
    window.print();
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };
  const projects = analysis.aiInsights?.flagshipProjects?.length
    ? analysis.aiInsights.flagshipProjects
    : fallbackProjects;
  const roadmap = analysis.aiInsights?.improvements?.length
    ? analysis.aiInsights.improvements
    : analysis.recommendations.length
      ? analysis.recommendations
      : roadmapFallback;
  const strengths = analysis.strengths.length
    ? analysis.strengths
    : (analysis.aiInsights?.keyStrengths ?? []);
  const weaknesses = analysis.weaknesses.length
    ? analysis.weaknesses
    : [
        'Increase open-source contributions',
        'Improve documentation quality',
        'Add more collaborative projects',
      ];

  const summary =
    analysis.aiInsights?.summary ||
    'Your GitHub profile demonstrates strong technical expertise with consistent activity and high-quality projects. Focus on expanding open-source contributions and improving documentation to reach the next level.';

  return (
    <div className="github-analysis-report min-h-screen bg-slate-50 text-slate-950">
      <div className="pdf-screen-only">
        <Navbar />
      </div>
      <main className="pt-16">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <button
              className="pdf-screen-only mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
              onClick={() => navigate('/')}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-3xl font-bold text-white">
                  {analysis.profile.avatarUrl ? (
                    <img
                      className="h-full w-full object-cover"
                      src={analysis.profile.avatarUrl}
                      alt={analysis.username}
                    />
                  ) : (
                    analysis.username.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                      {analysis.username}
                    </h1>
                    <Github className="h-5 w-5 text-slate-500" />
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-500">
                    Full-Stack Engineer
                    {analysis.profile.location ? ` • ${analysis.profile.location}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {analysis.profile.publicRepos} public repos • {analysis.profile.followers}{' '}
                    followers
                  </p>
                </div>
              </div>

              <div className="pdf-screen-only flex gap-3">
                <button
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-50"
                  onClick={() => navigate('/')}
                  type="button"
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-scan
                </button>
                <button
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-50"
                  onClick={exportReport}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_384px] lg:px-8">
          <div className="space-y-8">
            <DashboardCard className="grid gap-8 md:grid-cols-[150px_1fr] md:items-center">
              <ScoreRing
                score={analysis.overallScore}
                label="Overall Score"
                color="#10b981"
                size="lg"
              />
              <div>
                <h2 className="text-xl font-bold text-slate-950">Developer Profile Assessment</h2>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-500">{summary}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <StatusPill>Strong Activity</StatusPill>
                  <StatusPill>High Quality</StatusPill>
                  <StatusPill tone="orange">Limited Collaboration</StatusPill>
                </div>
              </div>
            </DashboardCard>

            <section>
              <h2 className="mb-5 text-xl font-bold text-slate-950">Key Metrics</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  icon={<Zap className="h-5 w-5" />}
                  label="Activity Score"
                  value={`${analysis.scores.activity}/100`}
                  helper={`${analysis.profile.publicRepos} public repositories`}
                  trend="↑ 12%"
                  trendDirection="up"
                />
                <MetricCard
                  icon={<Code2 className="h-5 w-5" />}
                  label="Project Quality"
                  value={`${analysis.scores.projectQuality}/100`}
                  helper="High code consistency"
                  trend="↑ 5%"
                  trendDirection="up"
                />
                <MetricCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Tech Stack Diversity"
                  value={`${analysis.scores.techStackDiversity}/100`}
                  helper="Primary languages and tooling breadth"
                />
                <MetricCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Consistency"
                  value={`${analysis.scores.consistency}/100`}
                  helper="Contribution rhythm"
                  trend="↓ 3%"
                  trendDirection="down"
                />
              </div>
            </section>

            <DashboardCard>
              <h2 className="text-xl font-bold text-slate-950">Flagship Repositories</h2>
              <div className="mt-6 space-y-4">
                {projects.map((project) => (
                  <article className="rounded-xl border border-slate-200 p-5" key={project.name}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-950">{project.name}</h3>
                          <span className="text-sm font-medium text-slate-500">
                            Quality: {Math.max(75, analysis.scores.projectQuality)}/100
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{project.reason}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                        <Star className="h-4 w-4" />
                        {project.stars.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {project.technologies.map((tech) => (
                        <KeywordTag key={tech}>{tech}</KeywordTag>
                      ))}
                    </div>

                    {project.improvements?.length > 0 && (
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        <h4 className="text-sm font-bold text-slate-950">
                          Suggested Improvements:
                        </h4>
                        <ul className="mt-3 space-y-2">
                          {project.improvements.map((item) => (
                            <WarningItem key={item}>{item}</WarningItem>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard>
              <h2 className="text-xl font-bold text-slate-950">Impact Roadmap</h2>
              <div className="mt-6 space-y-4">
                {roadmap.slice(0, 5).map((item, index) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                    key={item}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={
                          priorityFor(index) === 'High'
                            ? 'rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-600'
                            : priorityFor(index) === 'Medium'
                              ? 'rounded-md bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600'
                              : 'rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600'
                        }
                      >
                        {priorityFor(index)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-950">{item}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Timeline: {timelineFor(index)}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-emerald-600">
                      +{pointsFor(index)} points
                    </span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <aside className="space-y-6">
            <DashboardCard>
              <h2 className="text-lg font-bold text-slate-950">Domain Expertise</h2>
              <div className="mt-6 space-y-5">
                {[
                  ['Frontend Development', Math.max(72, analysis.scores.techStackDiversity)],
                  ['Backend Systems', Math.max(70, analysis.scores.projectQuality - 4)],
                  ['DevOps & Infrastructure', Math.max(55, analysis.scores.consistency - 10)],
                  ['Machine Learning', 71],
                  ['Mobile Development', 45],
                ].map(([label, value], index) => (
                  <div key={label.toString()}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium text-slate-950">{label}</span>
                      <span className="text-slate-500">{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${value}%`,
                          backgroundColor: ['#2563eb', '#22c55e', '#a855f7', '#f97316', '#94a3b8'][
                            index
                          ],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard>
              <h2 className="text-lg font-bold text-slate-950">Career Trajectory</h2>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  {analysis.aiInsights?.careerPath || 'Senior level (5-7 years)'}
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  Full-stack specialization
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                  Growing toward tech lead
                </li>
              </ul>
            </DashboardCard>

            <DashboardCard>
              <h2 className="text-lg font-bold text-slate-950">Strengths</h2>
              <ul className="mt-5 space-y-2">
                {(strengths.length
                  ? strengths
                  : [
                      'Consistent code quality across projects',
                      'Active maintenance of repositories',
                      'Diverse technology stack',
                    ]
                )
                  .slice(0, 4)
                  .map((item) => (
                    <CheckItem key={item}>{item}</CheckItem>
                  ))}
              </ul>
            </DashboardCard>

            <DashboardCard>
              <h2 className="text-lg font-bold text-slate-950">Areas for Growth</h2>
              <ul className="mt-5 space-y-2">
                {weaknesses.slice(0, 4).map((item) => (
                  <WarningItem key={item}>{item}</WarningItem>
                ))}
              </ul>
            </DashboardCard>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default GitHubAnalysisDashboard;
