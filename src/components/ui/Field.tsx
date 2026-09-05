import React from 'react';

/**
 * Form controls.
 *
 * One height, one radius, one focus treatment. Validation state is carried by
 * the border plus a message — never by colour alone, which is invisible to a
 * meaningful share of users.
 */

const CONTROL =
  'w-full rounded-control border bg-surface text-ink placeholder:text-ink-faint ' +
  'transition-colors disabled:bg-sunken disabled:text-ink-faint disabled:cursor-not-allowed';

const SIZES = {
  sm: 'h-7 px-2 text-micro',
  md: 'h-9 px-2.5 text-tiny',
};

interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Message shown under the control; also marks the control as invalid. */
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  className = '',
  children,
}) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-micro font-medium text-ink-soft mb-1">
      {label}
      {required && <span className="text-risk ml-0.5">*</span>}
    </label>
    {children}
    {error ? (
      <p className="text-micro text-risk mt-1">{error}</p>
    ) : hint ? (
      <p className="text-micro text-ink-faint mt-1">{hint}</p>
    ) : null}
  </div>
);

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  inputSize?: keyof typeof SIZES;
};

export const Input: React.FC<InputProps> = ({
  invalid,
  inputSize = 'md',
  className = '',
  ...rest
}) => (
  <input
    aria-invalid={invalid || undefined}
    className={[
      CONTROL,
      SIZES[inputSize],
      invalid ? 'border-risk' : 'border-line hover:border-line-strong',
      className,
    ].join(' ')}
    {...rest}
  />
);

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  inputSize?: keyof typeof SIZES;
};

export const Select: React.FC<SelectProps> = ({
  invalid,
  inputSize = 'md',
  className = '',
  children,
  ...rest
}) => (
  <select
    aria-invalid={invalid || undefined}
    className={[
      CONTROL,
      SIZES[inputSize],
      'pr-8 cursor-pointer',
      invalid ? 'border-risk' : 'border-line hover:border-line-strong',
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </select>
);

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea: React.FC<TextareaProps> = ({ invalid, className = '', ...rest }) => (
  <textarea
    aria-invalid={invalid || undefined}
    className={[
      CONTROL,
      'py-2 px-2.5 text-tiny leading-relaxed min-h-[72px] resize-y',
      invalid ? 'border-risk' : 'border-line hover:border-line-strong',
      className,
    ].join(' ')}
    {...rest}
  />
);
