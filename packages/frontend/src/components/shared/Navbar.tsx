import { Code2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    navigate(`/#${id}`);
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <button
          className="flex items-center gap-3"
          onClick={() => navigate('/')}
          type="button"
          aria-label="Go to home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Code2 className="h-4 w-4" />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-950">DevScore</span>
        </button>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <button
            className="text-sm font-medium text-slate-950"
            onClick={() => navigate('/')}
            type="button"
          >
            Home
          </button>
          <button
            className="text-sm font-medium text-slate-500 hover:text-slate-950"
            onClick={() => scrollToSection('how-it-works')}
            type="button"
          >
            How it Works
          </button>
          <button
            className="text-sm font-medium text-slate-500 hover:text-slate-950"
            onClick={() => scrollToSection('privacy')}
            type="button"
          >
            Privacy
          </button>
        </div>

        <div className="ml-auto hidden items-center gap-6 sm:flex">
          <button
            className="text-sm font-semibold text-slate-500 hover:text-slate-950"
            type="button"
          >
            Sign In
          </button>
          <button
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            onClick={() => scrollToSection('demo')}
            type="button"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};
