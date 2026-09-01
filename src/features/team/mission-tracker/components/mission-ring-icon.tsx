import { useId } from 'react';

interface MissionRingIconProps {
  size?: number;
  className?: string;
}

export function MissionRingIcon({ size = 40, className }: MissionRingIconProps) {
  const rawId = useId().replace(/:/g, '');
  const goldId = `mission-ring-gold-${rawId}`;
  const shineId = `mission-ring-shine-${rawId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={goldId} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff6c8" />
          <stop offset="35%" stopColor="#ffd54a" />
          <stop offset="70%" stopColor="#e6b422" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <radialGradient id={shineId} cx="32%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#ffd54a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#b8860b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="42" rx="11" ry="2.4" fill="#ffd54a" opacity="0.28" />
      <circle cx="24" cy="26" r="15.5" fill="none" stroke={`url(#${goldId})`} strokeWidth="7.5" />
      <circle cx="24" cy="26" r="15.5" fill="none" stroke={`url(#${shineId})`} strokeWidth="7.5" />
      <circle cx="24" cy="26" r="11.2" fill="none" stroke="#7a5a08" strokeOpacity="0.35" strokeWidth="1.2" />
      <path
        d="M24 5.5 L28.4 14.5 L19.6 14.5 Z"
        fill={`url(#${goldId})`}
        stroke="#f6e27a"
        strokeWidth="0.8"
      />
      <path d="M24 7.4 L26.6 13.2 L21.4 13.2 Z" fill="#fff6c8" opacity="0.7" />
    </svg>
  );
}
