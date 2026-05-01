import { Heart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const repositoryUrl = 'https://github.com/andriimaksymov/portfolio-score';

export const CallToAction = () => {
    const scrollToDemo = () => {
        document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="max-w-7xl mx-auto px-6 py-24">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-[4rem] p-8 md:p-20 text-center border border-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                <Heart className="mx-auto mb-8 text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]" size={64} />
                <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter text-white">
                    Open Source. <br /> Always Free.
                </h2>
                <p className="max-w-2xl mx-auto text-slate-400 mb-12 text-lg leading-relaxed">
                    Unlike competitors charging $50-200/month, this tool is built as a portfolio project to showcase production-ready full-stack development. No subscriptions. No paywalls.
                </p>

                <div className="max-w-md mx-auto mb-14">
                    <div className="text-left space-y-3">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                            <span className="text-slate-300 font-medium">Multi-source analysis (GitHub + LinkedIn + CV)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                            <span className="text-slate-300 font-medium">Triple-fallback AI for 99%+ uptime</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                            <span className="text-slate-300 font-medium">4-metric scoring with actionable insights</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                            <span className="text-slate-300 font-medium">Privacy-first (no long-term data storage)</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-6 relative z-10">
                    <Button
                        onClick={scrollToDemo}
                        size="xl"
                        className="bg-white text-slate-950 hover:bg-slate-200 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        Launch Analysis
                    </Button>
                    <a
                        href={repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-slate-800 border border-slate-700 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-700 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
                    >
                        View Source Code
                    </a>
                </div>

                <div className="mt-16 pt-16 border-t border-slate-800/50 flex flex-wrap justify-center gap-12 grayscale opacity-40">
                    <div className="flex items-center gap-2 font-black tracking-tighter text-xl text-white italic">React 18</div>
                    <div className="flex items-center gap-2 font-black tracking-tighter text-xl text-white italic">NestJS</div>
                    <div className="flex items-center gap-2 font-black tracking-tighter text-xl text-white italic">TypeScript</div>
                    <div className="flex items-center gap-2 font-black tracking-tighter text-xl text-white italic">Tailwind v4</div>
                </div>
            </div>
        </section>
    );
};
