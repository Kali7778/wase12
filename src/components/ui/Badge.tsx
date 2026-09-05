import React from 'react';

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'risk' | 'info';

interface BadgeProps {
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  /** A quieter form for use inside dense tables. */
  subtle?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Status badge.
 *
 * Colour here means state and nothing else — never brand, never decoration.
 * An operator scanning a list should be able to read the colour alone and know
 * whether something needs attention.
 */
const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft border-line',
  accent: 'bg-accent-soft text-accent-ink border-transparent',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  risk: 'bg-risk-soft text-risk border-transparent',
  info: 'bg-info-soft text-info border-transparent',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  icon: Icon,
  subtle = false,
  children,
  className = '',
}) => (
  <span
    className={[
      'inline-flex items-center gap-1 rounded-pill border font-semibold whitespace-nowrap',
      subtle ? 'px-1.5 py-0 text-micro' : 'px-2 py-0.5 text-micro',
      TONES[tone],
      className,
    ].join(' ')}
  >
    {Icon && <Icon className="w-3 h-3 shrink-0" />}
    {children}
  </span>
);

/** A small coloured dot for use where a full badge would be too heavy. */
export const StatusDot: React.FC<{ tone: Tone; className?: string }> = ({ tone, className = '' }) => {
  const colours: Record<Tone, string> = {
    neutral: 'bg-ink-faint',
    accent: 'bg-accent',
    ok: 'bg-ok',
    warn: 'bg-warn',
    risk: 'bg-risk',
    info: 'bg-info',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-pill shrink-0 ${colours[tone]} ${className}`} />;
};
