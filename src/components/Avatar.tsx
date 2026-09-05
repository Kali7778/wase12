import React from 'react';

interface AvatarProps {
  name: string;
  /** Optional real photo. Falls back to initials when absent or broken. */
  src?: string | null;
  size?: number;
  className?: string;
}

/**
 * Initials avatar.
 *
 * Replaces the stock photographs of strangers that were previously used as
 * placeholder avatars: those were sample content, loaded from an external
 * host on every render, and showed real people who have nothing to do with
 * this system.
 *
 * The colour is derived from the name, so the same person keeps the same
 * badge without anything being stored.
 */
const PALETTE = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-teal-600',
  'bg-orange-600',
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colourOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 40, className = '' }) => {
  const [failed, setFailed] = React.useState(false);
  const showPhoto = Boolean(src) && !failed;

  if (showPhoto) {
    return (
      <img
        src={src as string}
        alt={name}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      className={`rounded-full shrink-0 flex items-center justify-center font-bold text-white select-none ${colourOf(name)} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
};
