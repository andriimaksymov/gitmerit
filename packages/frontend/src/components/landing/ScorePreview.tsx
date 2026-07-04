const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SCORE = 87;

const metrics = [
  { label: 'Code quality', value: 92 },
  { label: 'Project impact', value: 78 },
  { label: 'Visibility', value: 64 },
];

const signals = ['12 repos', '4.2k commits', 'TypeScript · Go'];

/**
 * A sample of GitMerit's actual output, used as the hero artifact. Not a
 * screenshot — a real, animated readout so the hero shows the product instead
 * of describing it.
 */
export const ScorePreview = () => {
  const offset = CIRCUMFERENCE * (1 - SCORE / 100);

  return (
    <div className="relative w-full max-w-md">
      {/* Soft violet glow anchoring the card to the dark canvas. */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-violet-600/20 blur-3xl"
      />
      <div className="rounded-3xl border border-white/10 bg-ink-soft/90 p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-slate-400">github.com/octocat</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Analyzed
          </span>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <div className="relative h-[132px] w-[132px] shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#ffffff14" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                stroke="#7c3aed"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className="ring-progress"
                style={{ ['--ring-circumference' as string]: `${CIRCUMFERENCE}` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-bold leading-none text-white">{SCORE}</span>
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                / 100
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-white">Senior-ready</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Strong technical signal. Visibility is the biggest lever.
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{metric.label}</span>
                <span className="font-mono font-medium text-white">{metric.value}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          {signals.map((signal) => (
            <span
              key={signal}
              className="rounded-md bg-white/5 px-2.5 py-1 font-mono text-[11px] text-slate-300"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
