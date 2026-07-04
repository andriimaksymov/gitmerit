import { useRef } from 'react';
import { ArrowRight, Github, Linkedin, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScorePreview } from './ScorePreview';

interface HeroProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  inputValue: string;
  setInputValue: (val: string) => void;
  onRunEngine: () => void;
  onFileUpload?: (file: File) => void;
}

const sources = [
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'cv', label: 'Resume', icon: Upload },
];

export const Hero = ({
  activeTab,
  setActiveTab,
  inputValue,
  setInputValue,
  onRunEngine,
  onFileUpload,
}: HeroProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSourceSelect = (source: string) => {
    setActiveTab(source);
    setInputValue('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) onFileUpload(file);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file?.type === 'application/pdf' && onFileUpload) onFileUpload(file);
  };

  return (
    <section id="demo" className="relative overflow-hidden pt-28 pb-10 sm:pt-32">
      {/* Faint grid-free ambient wash — keeps the top of the page from reading flat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_70%_0%,rgba(124,58,237,0.10),transparent)]"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs font-medium text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              Developer profile analysis
            </span>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Know exactly how strong your developer profile is.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              GitMerit reads your GitHub, LinkedIn, and resume, then returns a scored,
              evidence-backed read — with the specific moves that raise it.
            </p>

            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ['3', 'sources analyzed'],
                ['0', 'sign-up required'],
                ['MIT', 'open source'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-mono text-2xl font-bold text-ink">{value}</dt>
                  <dd className="text-sm text-slate-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            className="reveal flex justify-center lg:justify-end"
            style={{ '--reveal-delay': '120ms' } as React.CSSProperties}
          >
            <ScorePreview />
          </div>
        </div>

        {/* The tool console. */}
        <div
          className="reveal mx-auto mt-16 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6"
          style={{ '--reveal-delay': '220ms' } as React.CSSProperties}
        >
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1.5">
            {sources.map((source) => {
              const Icon = source.icon;
              const selected = activeTab === source.id;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => handleSourceSelect(source.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    selected ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {source.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {activeTab === 'github' ? (
              <>
                <label className="block text-sm font-semibold text-ink" htmlFor="analysis-input">
                  GitHub username or profile URL
                </label>
                <input
                  id="analysis-input"
                  className="mt-2.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-mono text-[15px] text-ink outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  placeholder="octocat"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && inputValue) onRunEngine();
                  }}
                />
              </>
            ) : (
              <>
                <button
                  className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-violet-400 hover:bg-violet-50/50"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="mt-3.5 font-semibold text-ink">
                    {inputValue ||
                      (activeTab === 'linkedin'
                        ? 'Upload your LinkedIn PDF'
                        : 'Upload your resume')}
                  </span>
                  <span className="mt-1 text-sm text-slate-500">
                    Click to browse or drag &amp; drop · PDF up to 10MB
                  </span>
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </button>

                {activeTab === 'linkedin' && (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Export from LinkedIn: open your profile →{' '}
                    <strong className="font-semibold text-slate-700">More</strong> →{' '}
                    <strong className="font-semibold text-slate-700">Save to PDF</strong>.
                  </p>
                )}
              </>
            )}
          </div>

          {activeTab === 'github' && (
            <button
              className={cn(
                'mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600',
                inputValue
                  ? 'bg-ink text-white hover:-translate-y-0.5'
                  : 'bg-slate-200 text-slate-400'
              )}
              disabled={!inputValue}
              onClick={onRunEngine}
              type="button"
            >
              Analyze profile
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
