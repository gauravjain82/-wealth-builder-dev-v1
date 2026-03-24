import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import './header.css';

const LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/fa509ca3-1165-43d5-b075-f174c232cb04.png?alt=media&token=0f5855f4-8176-47ca-b842-6d7d1301b939';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get first name
  const firstName = (user?.displayName || user?.name || user?.email || 'User').split(' ')[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/settings');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setDropdownOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      navigate('/login');
    }
  };

  return (
    <header className="header">
      {/* Left: Logo */}
      <div className="header__logo-container">
        <img
          src={LOGO_URL}
          alt="Wealth Builders"
          className="header__logo"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Right: Welcome, Theme Toggle, Profile Dropdown */}
      <div className="header__right">
        <span className="header__welcome">
          Welcome, {firstName}
        </span>

        <ThemeToggle />

        <div ref={dropdownRef} className="header__dropdown">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`header__profile-button ${dropdownOpen ? 'header__profile-button--active' : ''}`}
            title="User menu"
          >
            Profile
          </button>

          {dropdownOpen && (
            <div className="header__dropdown-menu">
              {/* Header */}
              <div className="header__dropdown-header">
                <div className="header__dropdown-name">
                  {firstName}
                </div>
                <div className="header__dropdown-email">
                  {user?.email || 'user@example.com'}
                </div>
              </div>

              <div className="header__dropdown-divider" />

              {/* Profile Item */}
              <button
                onClick={handleProfileClick}
                className="header__dropdown-item"
              >
                <span>👤</span> Profile
              </button>

              <div className="header__dropdown-divider" />

              {/* Sign Out Item */}
              <button
                onClick={handleLogout}
                className="header__dropdown-item header__dropdown-item--danger"
              >
                <span>🚪</span> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
