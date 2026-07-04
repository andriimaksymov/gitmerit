import { Link, useNavigate } from 'react-router-dom';

const sectionLinks = [
  { label: 'How it works', id: 'how-it-works' },
  { label: 'What we measure', id: 'measure' },
  { label: 'Privacy', id: 'privacy' },
];

export const Navbar = () => {
  const navigate = useNavigate();

  const scrollToSection = (event: React.MouseEvent, id: string) => {
    const element = document.getElementById(id);
    if (element) {
      event.preventDefault();
      element.scrollIntoView({ behavior: 'smooth' });
    }
    // No element on this route → let the anchor navigate to /#id normally.
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="GitMerit home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-white transition-transform group-hover:-rotate-6">
            D
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">GitMerit</span>
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {sectionLinks.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={(event) => scrollToSection(event, link.id)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/history"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
          >
            History
          </Link>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="ml-auto rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 md:ml-4"
        >
          Analyze
        </button>
      </div>
    </nav>
  );
};
