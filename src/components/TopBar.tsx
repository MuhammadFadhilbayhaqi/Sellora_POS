import './TopBar.css';
import type { UserInfo } from '../App';

interface TopBarProps {
  user: UserInfo;
  title?: string;
}

function getInitials(nama: string): string {
  return nama
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function TopBar({ user, title = 'Dashboard' }: TopBarProps) {
  return (
    <header className="topbar">
      {/* Left: Page title */}
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
      </div>

      {/* Right: Notification + Profile */}
      <div className="topbar-right">
        {/* Notification Bell */}
        <button className="topbar-notification" title="Notifikasi">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notification-badge">3</span>
        </button>

        {/* Divider */}
        <div className="topbar-divider"></div>

        {/* Profile */}
        <div className="topbar-profile">
          <div className="topbar-avatar">{getInitials(user.nama)}</div>
          <div className="topbar-profile-info">
            <span className="topbar-profile-name">{user.nama}</span>
            <span className="topbar-profile-role">@{user.username}</span>
          </div>
          <div className="topbar-profile-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
