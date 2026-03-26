import { useState } from 'react';
import './SettingsLayout.css';
import MyAccountPage from '../pages/MyAccountPage';
import BusinessProfilePage from '../pages/BusinessProfilePage';
import ReceiptSettingsPage from '../pages/ReceiptSettingsPage';
import DeviceSettingsPage from '../pages/DeviceSettingsPage';

interface SettingsLayoutProps {
  onBack: () => void;
}

const settingsMenuItems = [
  {
    id: 'my-account',
    label: 'Akun Saya',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'business-profile',
    label: 'Profil Bisnis',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'receipt',
    label: 'Pengaturan Struk',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    ),
  },
  {
    id: 'device',
    label: 'Pengaturan Perangkat',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

function SettingsLayout({ onBack }: SettingsLayoutProps) {
  const [activeSettingsMenu, setActiveSettingsMenu] = useState('my-account');

  const renderSettingsPage = () => {
    switch (activeSettingsMenu) {
      case 'my-account':
        return <MyAccountPage />;
      case 'business-profile':
        return <BusinessProfilePage />;
      case 'receipt':
        return <ReceiptSettingsPage />;
      case 'device':
      default:
        return <DeviceSettingsPage />;
    }
  };

  return (
    <div className="settings-layout">
      {/* Settings Sidebar */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <button className="settings-back-btn" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
            <span>Kembali</span>
          </button>
          <h2 className="settings-sidebar-title">Pengaturan</h2>
        </div>

        <nav className="settings-sidebar-menu">
          {settingsMenuItems.map((item) => (
            <div
              key={item.id}
              className={`settings-menu-item ${activeSettingsMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveSettingsMenu(item.id)}
            >
              <span className="settings-menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="settings-sidebar-footer">
          <div className="settings-version">
            <span>Sellora POS</span>
            <span className="version-tag">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Settings Content */}
      <main className="settings-content">
        {renderSettingsPage()}
      </main>
    </div>
  );
}

export default SettingsLayout;
