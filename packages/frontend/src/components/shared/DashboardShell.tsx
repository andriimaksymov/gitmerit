import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/shared/Navbar';

interface DashboardShellProps {
  children: ReactNode;
  /** Extra classes for the outer page wrapper (e.g. a print/report scope). */
  className?: string;
  /** Optional wrapper around the Navbar (e.g. `pdf-screen-only` for PDF export). */
  navWrapperClassName?: string;
}

/**
 * Shared page scaffold for the analysis dashboards: full-height slate page,
 * the app-global Navbar, and a `pt-16` main region. Extracted from the three
 * dashboards that previously repeated this identical wrapper.
 */
export function DashboardShell({ children, className, navWrapperClassName }: DashboardShellProps) {
  return (
    <div className={cn('min-h-screen bg-slate-50 text-slate-950', className)}>
      {navWrapperClassName ? (
        <div className={navWrapperClassName}>
          <Navbar />
        </div>
      ) : (
        <Navbar />
      )}
      <main className="pt-16">{children}</main>
    </div>
  );
}
