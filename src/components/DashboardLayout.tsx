import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './DashboardLayout.css';
import type { UserInfo } from '../App';
import CategoryPage from '../pages/CategoryPage';
import UnitPage from '../pages/UnitPage';
import ProductPage from '../pages/ProductPage';
import InventoryListPage from '../pages/InventoryListPage';
import PurchaseOrderPage from '../pages/PurchaseOrderPage';
import StockOpnamePage from '../pages/StockOpnamePage';
import WastePage from '../pages/WastePage';
import ReturnPage from '../pages/ReturnPage';
import SupplierPage from '../pages/SupplierPage';
import PaymentMethodPage from '../pages/PaymentMethodPage';
import TaxPage from '../pages/TaxPage';
import TransactionHistoryPage from '../pages/TransactionHistoryPage';
import CashierPage from '../pages/CashierPage';
import SalesReportPage from '../pages/SalesReportPage';
import SalesPerProductPage from '../pages/SalesPerProductPage';
import SalesPerMethodPage from '../pages/SalesPerMethodPage';
import DashboardPage from '../pages/DashboardPage';
import SettingsLayout from './SettingsLayout';

interface DashboardLayoutProps {
  user: UserInfo;
  onLogout: () => void;
}

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  kasir: 'Kasir',
  products: 'Produk',
  categories: 'Kategori',
  units: 'Satuan',
  'inventory-list': 'Daftar Stok',
  purchases: 'Pembelian Stok',
  'stock-opname': 'Stock Opname',
  waste: 'Stok Terbuang',
  returns: 'Retur',
  supplier: 'Supplier',
  'payment-methods': 'Metode Pembayaran',
  taxes: 'Pajak',
  'transaction-history': 'Riwayat Transaksi',
  'report-sales': 'Laporan Penjualan',
  'report-products': 'Laporan Per Produk',
  'report-methods': 'Laporan Per Metode',
  settings: 'Pengaturan',
};

function DashboardLayout({ user, onLogout }: DashboardLayoutProps) {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Kasir gets a full-screen layout without TopBar
  if (activeMenu === 'kasir') {
    return (
      <div className="dashboard-layout cashier-mode">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} onLogout={onLogout} />
        <main className="dashboard-main cashier-main">
          <CashierPage user={user} />
        </main>
      </div>
    );
  }

  // Settings gets its own full-screen layout (no main sidebar)
  if (activeMenu.startsWith('settings')) {
    return <SettingsLayout onBack={() => setActiveMenu('dashboard')} />;
  }

  const renderPage = () => {
    switch (activeMenu) {
      case 'categories':
        return <CategoryPage />;
      case 'units':
        return <UnitPage />;
      case 'products':
        return <ProductPage />;
      case 'inventory-list':
        return <InventoryListPage />;
      case 'purchases':
        return <PurchaseOrderPage />;
      case 'stock-opname':
        return <StockOpnamePage />;
      case 'waste':
        return <WastePage />;
      case 'returns':
        return <ReturnPage />;
      case 'supplier':
        return <SupplierPage />;
      case 'payment-methods':
        return <PaymentMethodPage />;
      case 'taxes':
        return <TaxPage />;
      case 'transaction-history':
        return <TransactionHistoryPage />;
      case 'report-sales':
        return <SalesReportPage />;
      case 'report-products':
        return <SalesPerProductPage />;
      case 'report-methods':
        return <SalesPerMethodPage />;
      case 'dashboard':
      default:
        return <DashboardPage onNavigate={setActiveMenu} />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} onLogout={onLogout} />
      <TopBar user={user} title={pageTitles[activeMenu] || 'Dashboard'} />
      <main className="dashboard-main">
        {renderPage()}
      </main>
    </div>
  );
}

export default DashboardLayout;
