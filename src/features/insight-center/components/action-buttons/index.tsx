import { Link } from 'react-router-dom';
import './action-buttons.css';

interface ButtonConfig {
  to: string;
  label: string;
  ariaLabel: string;
}

interface ActionButtonsProps {
  buttons: ButtonConfig[];
  className?: string;
  leadingLink?: ButtonConfig;
}

export function ActionButtons({ buttons, className = '', leadingLink }: ActionButtonsProps) {
  return (
    <div className={`ic-btn-row ${className}`}>
      {leadingLink && (
        <Link
          className="ic-back-link"
          to={leadingLink.to}
          aria-label={leadingLink.ariaLabel}
        >
          <span aria-hidden="true">&larr;</span>
          <span>{leadingLink.label}</span>
        </Link>
      )}
      {buttons.map((button, index) => (
        <Link
          key={index}
          className="ic-btn"
          to={button.to}
          role="button"
          aria-label={button.ariaLabel}
        >
          <span className="ic-btn-label">{button.label}</span>
        </Link>
      ))}
    </div>
  );
}
