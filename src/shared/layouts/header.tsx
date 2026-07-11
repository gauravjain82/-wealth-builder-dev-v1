import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { Bell, CheckCheck } from 'lucide-react';
import { inAppNotificationService, type InAppNotification } from '@/features/matchup/services/inapp-notification-service';
import './header.css';

const LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/wealthbuilders-crm-9c323.firebasestorage.app/o/fa509ca3-1165-43d5-b075-f174c232cb04.png?alt=media&token=0f5855f4-8176-47ca-b842-6d7d1301b939';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Get first name
  const firstName = (user?.displayName || user?.name || user?.email || 'User').split(' ')[0];

  // Avatar: photo URL or initials
  const avatarUrl = user?.photoURL || null;
  const initials = (() => {
    const full = user?.displayName || user?.name || '';
    const parts = full.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    return (user?.email?.[0] ?? 'U').toUpperCase();
  })();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    if (dropdownOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, notificationsOpen]);

  useEffect(() => {
    if (!user || !localStorage.getItem('wb.authToken')) return;
    const refreshCount = () => void inAppNotificationService.unreadCount().then(setUnreadCount).catch(() => undefined);
    refreshCount();
    const interval = window.setInterval(refreshCount, 60_000);
    return () => window.clearInterval(interval);
  }, [user]);

  const openNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setDropdownOpen(false);
    if (!nextOpen) return;
    setNotificationsLoading(true);
    try {
      const data = await inAppNotificationService.unread();
      setNotifications(data.results);
      setUnreadCount(data.count);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const openNotification = async (notification: InAppNotification) => {
    await inAppNotificationService.markRead([notification.id]).catch(() => undefined);
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    setUnreadCount((current) => Math.max(0, current - 1));
    setNotificationsOpen(false);
    navigate('/matchup', { state: { appointmentId: notification.payload?.appointment_id } });
  };

  const markAllNotificationsRead = async () => {
    await inAppNotificationService.markAllRead();
    setNotifications([]);
    setUnreadCount(0);
  };

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

        <div ref={notificationsRef} className="header__notifications">
          <button type="button" className="header__bell-button" onClick={() => void openNotifications()} aria-label="Open notifications" title="Notifications">
            <Bell size={20} />
            {unreadCount > 0 ? <span className="header__notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
          </button>
          {notificationsOpen ? (
            <div className="header__notification-menu">
              <div className="header__notification-title"><strong>Notifications</strong>{notifications.length ? <button type="button" onClick={() => void markAllNotificationsRead()}><CheckCheck size={15} /> Mark all read</button> : null}</div>
              <div className="header__notification-list">
                {notificationsLoading ? <p>Loading notifications...</p> : notifications.length ? notifications.map((notification) => (
                  <button key={notification.id} type="button" className="header__notification-item" onClick={() => void openNotification(notification)}>
                    <span className="header__notification-dot" />
                    <span><strong>{notification.title}</strong><small>{notification.body}</small><time>{new Date(notification.created_at).toLocaleString()}</time></span>
                  </button>
                )) : <p>You're all caught up.</p>}
              </div>
            </div>
          ) : null}
        </div>

        <div ref={dropdownRef} className="header__dropdown">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`header__avatar-button ${dropdownOpen ? 'header__avatar-button--active' : ''}`}
            title="User menu"
            aria-label="Open user menu"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={firstName} className="header__avatar-img" />
            ) : (
              <span className="header__avatar-initials">{initials}</span>
            )}
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
