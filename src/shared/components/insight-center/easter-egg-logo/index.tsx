import './easter-egg-logo.css';

interface EasterEggLogoProps {
  logoSrc: string;
  alt?: string;
  onClick: () => void;
  className?: string;
}

export function EasterEggLogo({ logoSrc, alt = 'Wealth Builders', onClick, className = '' }: EasterEggLogoProps) {
  return (
    <div className={`ic-logo-container ${className}`}>
      <img
        src={logoSrc}
        alt={alt}
        className="ic-logo"
        onClick={onClick}
      />
    </div>
  );
}
