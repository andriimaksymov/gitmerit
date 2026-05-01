import { Github, Sparkles } from 'lucide-react';

const repositoryUrl = 'https://github.com/andriimaksymov/portfolio-score';

export const Footer = () => {
    return (
        <footer className="py-15 border-t border-slate-900/50">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-15">
                    <div className="max-w-sm">
                        <div className="flex items-center gap-3 mb-8 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="bg-indigo-600 p-2 rounded-xl">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">DevScore</span>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed mb-8">
                            An experimental platform for technical career analysis. Built to bridge the gap between complex engineering history and professional impact.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href={repositoryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors group"
                            >
                                <Github size={20} className="text-slate-500 group-hover:text-white" />
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">What We Analyze</h4>
                            <ul className="space-y-4 text-xs font-bold text-slate-600">
                                <li className="hover:text-white transition-colors cursor-pointer">GitHub Contributions</li>
                                <li className="hover:text-white transition-colors cursor-pointer">LinkedIn Profile</li>
                                <li className="hover:text-white transition-colors cursor-pointer">Resume Impact</li>
                                <li className="hover:text-white transition-colors cursor-pointer">AI Career Insights</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Tech Stack</h4>
                            <ul className="space-y-4 text-xs font-bold text-slate-600">
                                <li className="hover:text-white transition-colors cursor-pointer">NestJS + TypeScript</li>
                                <li className="hover:text-white transition-colors cursor-pointer">React 18 + Tailwind</li>
                                <li className="hover:text-white transition-colors cursor-pointer">3-Tier AI Fallback</li>
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Open Source</h4>
                            <p className="text-xs text-slate-600 leading-relaxed font-bold">
                                Free forever. No signup required. <br />
                                <a
                                    href={repositoryUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white mt-1 block cursor-pointer hover:underline"
                                >
                                    View code on GitHub →
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-10 border-t border-slate-900 flex justify-center items-center gap-6">
                    <p className="text-[10px] text-slate-700 font-mono uppercase tracking-widest">
                        © 2026 DevScore | Portfolio project
                    </p>
                </div>
            </div>
        </footer>
    );
};
