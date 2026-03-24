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
}

export function ActionButtons({ buttons, className = '' }: ActionButtonsProps) {
  return (
    <div className={`ic-btn-row ${className}`}>
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
