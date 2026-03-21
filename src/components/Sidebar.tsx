import { useState } from 'react';
import './Sidebar.css';
import ConfirmDialog from './ConfirmDialog';

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  onLogout: () => void;
}

// Top-level items rendered ABOVE "Menu Utama"
const topItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'kasir',
    label: 'Kasir',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="14" x2="6" y2="14.01" />
        <line x1="10" y1="14" x2="10" y2="14.01" />
        <line x1="14" y1="14" x2="14" y2="14.01" />
        <line x1="18" y1="14" x2="18" y2="14.01" />
        <line x1="6" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
];

const menuItems = [
  {
    id: 'master-data',
    label: 'Master Data',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5V19A9 3 0 0 0 21 19V5" />
        <path d="M3 12A9 3 0 0 0 21 12" />
      </svg>
    ),
    subMenus: [
      { id: 'products', label: 'Produk', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )},
      { id: 'categories', label: 'Kategori', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )},
      { id: 'units', label: 'Satuan', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h7v7H3z" />
          <path d="M14 3h7v7h-7z" />
          <path d="M14 14h7v7h-7z" />
          <path d="M3 14h7v7H3z" />
        </svg>
      )},
    ],
  },
  {
    id: 'stok',
    label: 'Stok',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    subMenus: [
      { id: 'inventory-list', label: 'Daftar Stok', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h18v18H3z" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      )},
      { id: 'purchases', label: 'Pembelian', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )},
      { id: 'stock-opname', label: 'Stock Opname', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )},
      { id: 'waste', label: 'Stok Terbuang', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )},
      { id: 'supplier', label: 'Supplier', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )},
      { id: 'returns', label: 'Retur', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      )},
    ],
  },
  {
    id: 'transaksi',
    label: 'Transaksi',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    subMenus: [
      { id: 'payment-methods', label: 'Metode Pembayaran', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      )},
      { id: 'taxes', label: 'Pajak', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )},
      { id: 'transaction-history', label: 'Riwayat Transaksi', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      )},
    ],
  },
  {
    id: 'laporan',
    label: 'Laporan',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    subMenus: [
      { id: 'report-sales', label: 'Laporan Penjualan', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )},
      { id: 'report-products', label: 'Per Produk', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )},
      { id: 'report-methods', label: 'Per Metode Pembayaran', icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      )},
    ],
  },
];

// Collect all sub-menu IDs from both topItems and menuItems
const allSubMenuIds = [...topItems, ...menuItems]
  .filter((m) => 'subMenus' in m && m.subMenus)
  .flatMap((m) => (m as any).subMenus!.map((s: any) => s.id));

function Sidebar({ activeMenu, onMenuChange, onLogout }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['master-data']);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isSubMenuActive = (parentId: string) => {
    const all = [...topItems, ...menuItems];
    const parent = all.find((m) => m.id === parentId);
    if (!parent || !('subMenus' in parent)) return false;
    return (parent as any).subMenus?.some((s: any) => s.id === activeMenu) ?? false;
  };

  const toggleExpand = (id: string) => {
    setExpandedMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleMenuClick = (item: any) => {
    if (item.subMenus) {
      toggleExpand(item.id);
    } else {
      onMenuChange(item.id);
    }
  };

  const handleSubMenuClick = (subId: string) => {
    onMenuChange(subId);
  };

  const isActiveItem = (id: string) => {
    if (allSubMenuIds.includes(activeMenu)) {
      return false;
    }
    return activeMenu === id;
  };

  const renderMenuItem = (item: any) => (
    <div key={item.id}>
      <div
        className={`sidebar-menu-item ${isActiveItem(item.id) ? 'active' : ''} ${isSubMenuActive(item.id) ? 'parent-active' : ''}`}
        onClick={() => handleMenuClick(item)}
      >
        <span className="menu-icon">{item.icon}</span>
        <span>{item.label}</span>
        {item.subMenus && (
          <span className={`menu-chevron ${expandedMenus.includes(item.id) ? 'expanded' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </span>
        )}
      </div>
      {item.subMenus && (
        <div className={`sidebar-submenu ${expandedMenus.includes(item.id) ? 'expanded' : ''}`}>
          {item.subMenus.map((sub: any) => (
            <div
              key={sub.id}
              className={`sidebar-submenu-item ${activeMenu === sub.id ? 'active' : ''}`}
              onClick={() => handleSubMenuClick(sub.id)}
            >
              <span className="menu-icon">{sub.icon}</span>
              <span>{sub.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 13h18L18 2z" />
              <path d="M3 13v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M12 22V13" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <span className="brand">Sellora</span>
            <span className="sub">Point of Sale</span>
          </div>
        </div>

        {/* Top Items (Dashboard & Kasir) */}
        <nav className="sidebar-menu">
          {topItems.map((item) => renderMenuItem(item))}

          {/* Main Menu */}
          <span className="sidebar-menu-label">Menu Utama</span>
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div
            className={`sidebar-menu-item sidebar-settings-item ${activeMenu.startsWith('settings') ? 'active' : ''}`}
            onClick={() => onMenuChange('settings')}
          >
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </span>
            <span>Pengaturan</span>
          </div>
          <div className="sidebar-menu-item" onClick={() => setShowLogoutConfirm(true)}>
            <span className="menu-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span>Keluar</span>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <ConfirmDialog
          title="Keluar dari Akun?"
          message="Anda yakin ingin keluar? Anda perlu login kembali untuk mengakses aplikasi."
          confirmText="Ya, Keluar"
          cancelText="Batal"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            onLogout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </>
  );
}

export default Sidebar;
