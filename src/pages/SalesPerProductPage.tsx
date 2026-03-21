import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import './SalesReportPage.css';
import Pagination from '../components/Pagination';

interface ProductSale {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  qty_sold: number;
  total_revenue: number;
}

interface SaleHistory {
  invoice_number: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
}

function SalesPerProductPage() {
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<ProductSale[]>([]);
  const [historyTarget, setHistoryTarget] = useState<ProductSale | null>(null);
  const [history, setHistory] = useState<SaleHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const dateForPeriod = useCallback(() => {
    if (period === 'daily') return date;
    if (period === 'monthly') return date.slice(0, 7);
    return date.slice(0, 4);
  }, [period, date]);

  const loadData = useCallback(async () => {
    try {
      const data = await invoke<ProductSale[]>('get_sales_per_product', { period, date: dateForPeriod() });
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load per-product report:', e);
    }
  }, [period, dateForPeriod]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setCurrentPage(1); }, [products]);

  const openHistory = async (p: ProductSale) => {
    setHistoryTarget(p);
    try {
      const data = await invoke<SaleHistory[]>('get_product_sales_history', { variantId: p.variant_id, period, date: dateForPeriod() });
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setHistory([]);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const totalQty = products.reduce((s, p) => s + p.qty_sold, 0);
  const totalRev = products.reduce((s, p) => s + p.total_revenue, 0);

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Laporan Penjualan Per Produk</h2>
          <p>Lihat detail penjualan berdasarkan produk</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="report-period-selector">
        <div className="period-tabs">
          {(['daily', 'monthly', 'yearly'] as const).map(p => (
            <button key={p} className={`period-tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {p === 'daily' ? 'Harian' : p === 'monthly' ? 'Bulanan' : 'Tahunan'}
            </button>
          ))}
        </div>
        <input
          type={period === 'daily' ? 'date' : period === 'monthly' ? 'month' : 'number'}
          value={period === 'yearly' ? date.slice(0, 4) : period === 'monthly' ? date.slice(0, 7) : date}
          onChange={(e) => {
            if (period === 'yearly') setDate(`${e.target.value}-01-01`);
            else if (period === 'monthly') setDate(`${e.target.value}-01`);
            else setDate(e.target.value);
          }}
          className="period-date-input"
          min={period === 'yearly' ? 2020 : undefined}
          max={period === 'yearly' ? 2030 : undefined}
        />
      </div>

      <div className="master-table-card">
        {products.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <p>Belum ada penjualan pada periode ini</p>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Qty Terjual</th>
                <th>Total Pendapatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((p, idx) => (
                <tr key={p.variant_id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon category-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </span>
                      {p.product_name}
                      {p.variant_name !== 'Default' && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — {p.variant_name}</span>}
                    </div>
                  </td>
                  <td><span className="td-sku">{p.sku}</span></td>
                  <td style={{ fontWeight: 700 }}>{p.qty_sold}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(p.total_revenue)}</td>
                  <td>
                    <button className="btn-icon btn-edit" title="Lihat Riwayat" onClick={() => openHistory(p)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                <td></td>
                <td colSpan={2}>Total</td>
                <td>{totalQty}</td>
                <td style={{ color: 'var(--success)' }}>{formatCurrency(totalRev)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(products.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={products.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {/* History Modal */}
      {historyTarget && (
        <div className="modal-overlay" onClick={() => setHistoryTarget(null)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Riwayat Penjualan — {historyTarget.product_name}{historyTarget.variant_name !== 'Default' ? ` (${historyTarget.variant_name})` : ''}</h3>
              <button className="modal-close" onClick={() => setHistoryTarget(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Tidak ada riwayat</div>
              ) : (
                <table className="master-table">
                  <thead>
                    <tr>
                      <th>No. Invoice</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Subtotal</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{h.invoice_number}</td>
                        <td>{h.quantity}</td>
                        <td>{formatCurrency(h.price)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(h.subtotal)}</td>
                        <td className="td-date">{h.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesPerProductPage;
