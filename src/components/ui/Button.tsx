import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  /** Renders the icon only; `children` becomes the accessible label. */
  iconOnly?: boolean;
}

/**
 * The only button in the system.
 *
 * Exactly one variant — `primary` — carries the accent colour, so the primary
 * action on any screen is unambiguous. `danger` is not an accent: it is a
 * warning, and it is reserved for destructive actions.
 *
 * No gradients and no coloured glows. On a screen an operator reads all day,
 * decoration on every control is what makes an interface tiring.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover border border-transparent shadow-xs disabled:bg-ink-faint',
  secondary:
    'bg-surface text-ink border border-line hover:bg-raised hover:border-line-strong shadow-xs',
  ghost: 'bg-transparent text-ink-soft border border-transparent hover:bg-raised hover:text-ink',
  danger: 'bg-risk text-white hover:brightness-95 border border-transparent shadow-xs',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-micro gap-1.5',
  md: 'h-9 px-3.5 text-tiny gap-2',
};

const ICON_SIZES: Record<Size, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconOnly = false,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  const iconClass = ICON_SIZES[size];

  return (
    <button
      disabled={disabled || loading}
      aria-label={iconOnly && typeof children === 'string' ? children : undefined}
      className={[
        'inline-flex items-center justify-center rounded-control font-semibold',
        'transition-colors duration-150 cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        iconOnly ? (size === 'sm' ? 'h-7 w-7 px-0' : 'h-9 w-9 px-0') : SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : (
        Icon && <Icon className={iconClass} />
      )}
      {!iconOnly && children}
    </button>
  );
};
