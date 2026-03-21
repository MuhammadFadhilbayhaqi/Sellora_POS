import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import './SalesReportPage.css';
import Pagination from '../components/Pagination';

interface MethodSale {
  method_id: string;
  method_name: string;
  method_type: string;
  total_transactions: number;
  total_amount: number;
}

function SalesPerMethodPage() {
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [methods, setMethods] = useState<MethodSale[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const dateForPeriod = useCallback(() => {
    if (period === 'daily') return date;
    if (period === 'monthly') return date.slice(0, 7);
    return date.slice(0, 4);
  }, [period, date]);

  const loadData = useCallback(async () => {
    try {
      const data = await invoke<MethodSale[]>('get_sales_per_method', { period, date: dateForPeriod() });
      setMethods(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load per-method report:', e);
    }
  }, [period, dateForPeriod]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => { setCurrentPage(1); }, [methods]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const typeLabel = (t: string) => {
    const m: Record<string, string> = { CASH: 'Tunai', DEBIT: 'Debit', CREDIT: 'Kredit', EWALLET: 'E-Wallet', QRIS: 'QRIS', TRANSFER: 'Transfer' };
    return m[t] || t;
  };

  const totalTx = methods.reduce((s, m) => s + m.total_transactions, 0);
  const totalAmt = methods.reduce((s, m) => s + m.total_amount, 0);

  // Color for percentage bars
  const maxAmt = Math.max(...methods.map(m => m.total_amount), 1);

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Laporan Per Metode Pembayaran</h2>
          <p>Breakdown penjualan berdasarkan metode pembayaran</p>
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

      {/* Summary cards */}
      <div className="report-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '20px' }}>
        <div className="report-card">
          <div className="report-card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
          </div>
          <div className="report-card-content">
            <span className="report-card-label">Total Transaksi</span>
            <span className="report-card-value">{totalTx}</span>
          </div>
        </div>
        <div className="report-card">
          <div className="report-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div className="report-card-content">
            <span className="report-card-label">Total Pendapatan</span>
            <span className="report-card-value">{formatCurrency(totalAmt)}</span>
          </div>
        </div>
      </div>

      <div className="master-table-card">
        {methods.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            </div>
            <p>Belum ada data penjualan pada periode ini</p>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Metode</th>
                <th>Tipe</th>
                <th>Jumlah Transaksi</th>
                <th>Total Pembayaran</th>
                <th>Persentase</th>
              </tr>
            </thead>
            <tbody>
              {methods.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((m, idx) => {
                const pct = totalAmt > 0 ? (m.total_amount / totalAmt * 100) : 0;
                return (
                  <tr key={m.method_id}>
                    <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td>
                      <div className="td-name">
                        <span className="name-icon category-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                        </span>
                        {m.method_name}
                      </div>
                    </td>
                    <td><span className="badge">{typeLabel(m.method_type)}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.total_transactions}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(m.total_amount)}</td>
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--border-color)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(m.total_amount / maxAmt) * 100}%`,
                            height: '100%',
                            borderRadius: '4px',
                            background: `linear-gradient(90deg, #6366f1, #818cf8)`,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '40px' }}>{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                <td></td>
                <td colSpan={2}>Total</td>
                <td>{totalTx}</td>
                <td style={{ color: 'var(--success)' }}>{formatCurrency(totalAmt)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(methods.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={methods.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>
    </div>
  );
}

export default SalesPerMethodPage;
