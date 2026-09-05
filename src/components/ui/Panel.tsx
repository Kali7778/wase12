import React from 'react';

/**
 * Layout primitives.
 *
 * Every screen is built from the same three pieces — a page header, panels,
 * and an empty state — so that navigating between modules never requires
 * relearning where things are.
 */

interface PanelProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Removes the body padding, for panels that contain a table. */
  flush?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  description,
  actions,
  flush = false,
  children,
  className = '',
}) => (
  <section
    className={`bg-surface border border-line rounded-panel overflow-hidden ${className}`}
  >
    {(title || actions) && (
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-line">
        <div className="min-w-0">
          {title && <h2 className="text-tiny font-semibold text-ink truncate">{title}</h2>}
          {description && <p className="text-micro text-ink-faint mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    )}
    <div className={flush ? '' : 'p-4'}>{children}</div>
  </section>
);

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Small figures shown under the title, e.g. counts by status. */
  stats?: Array<{ label: string; value: React.ReactNode }>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, stats }) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-1">
    <div className="min-w-0">
      <h1 className="text-lead font-semibold text-ink tracking-tight">{title}</h1>
      {description && <p className="text-tiny text-ink-soft mt-1 max-w-2xl">{description}</p>}
      {stats && stats.length > 0 && (
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <dd className="text-tiny font-semibold text-ink" data-numeric>
                {s.value}
              </dd>
              <dt className="text-micro text-ink-faint">{s.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </header>
);

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Empty state.
 *
 * An empty table is not an error, and it should never look like one. It says
 * what belongs here and how to add the first record.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6">
    {Icon && (
      <div className="w-10 h-10 rounded-panel bg-sunken border border-line flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-ink-faint" />
      </div>
    )}
    <p className="text-tiny font-semibold text-ink">{title}</p>
    {description && <p className="text-micro text-ink-faint mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** A labelled figure, for the summary strip above a table. */
export const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'ok' | 'warn' | 'risk';
}> = ({ label, value, hint, tone = 'default' }) => {
  const tones = {
    default: 'text-ink',
    ok: 'text-ok',
    warn: 'text-warn',
    risk: 'text-risk',
  };
  return (
    <div className="px-4 py-3 min-w-0">
      <p className="text-micro text-ink-faint truncate">{label}</p>
      <p className={`text-lead font-semibold mt-0.5 ${tones[tone]}`} data-numeric>
        {value}
      </p>
      {hint && <p className="text-micro text-ink-faint mt-0.5 truncate">{hint}</p>}
    </div>
  );
};
