import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './SalesReportPage.css';
import './DashboardPage.css';

interface DashboardPageProps {
  onNavigate: (menu: string) => void;
}

interface ReportData {
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
  total_items_sold: number;
  estimated_profit: number;
  chart_labels: string[];
  chart_values: number[];
}

interface ProductSale {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  qty_sold: number;
  total_revenue: number;
}

interface Transaction {
  id: string;
  invoice_number: string;
  grand_total: number;
  status: string;
  created_at: string;
}

function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [topProduct, setTopProduct] = useState<ProductSale | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      const [rpt, products, txList] = await Promise.all([
        invoke<ReportData>('get_sales_report', { period: 'daily', date: today }),
        invoke<ProductSale[]>('get_sales_per_product', { period: 'daily', date: today }),
        invoke<Transaction[]>('get_transaction_history'),
      ]);
      setReport(rpt);
      const arr = Array.isArray(products) ? products : [];
      setTopProduct(arr.length > 0 ? arr[0] : null);
      const txArr = Array.isArray(txList) ? txList : [];
      setRecentTx(txArr.slice(0, 5));
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  // Draw chart
  useEffect(() => {
    if (!report || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const { chart_labels: labels, chart_values: values } = report;
    if (labels.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Belum ada penjualan hari ini', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...values, 1);
    const barWidth = Math.min(36, (chartW / labels.length) * 0.6);
    const gap = chartW / labels.length;

    const gridLines = 5;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + chartH - (chartH / gridLines) * i;
      const val = (maxVal / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(formatShort(val), padding.left - 8, y + 4);
    }

    labels.forEach((label, i) => {
      const x = padding.left + gap * i + (gap - barWidth) / 2;
      const barH = (values[i] / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(1, '#a5b4fc');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, padding.left + gap * i + gap / 2, h - padding.bottom + 20);
    });
  }, [report]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = { OPEN: 'Berjalan', HOLD: 'Ditahan', PAID: 'Lunas', CANCELLED: 'Dibatalkan', REFUNDED: 'Refund' };
    return m[s] || s;
  };
  const statusClass = (s: string) => {
    if (s === 'PAID') return 'active';
    if (s === 'CANCELLED' || s === 'REFUNDED') return 'inactive';
    return '';
  };

  const dateLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard-content">
      {/* Header */}
      <div className="dashboard-welcome">
        <h2>Selamat Datang 👋</h2>
        <p>{dateLabel}</p>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="report-cards">
          <div className="report-card">
            <div className="report-card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
            </div>
            <div className="report-card-content">
              <span className="report-card-label">Total Transaksi</span>
              <span className="report-card-value">{report.total_transactions}</span>
            </div>
          </div>
          <div className="report-card">
            <div className="report-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <div className="report-card-content">
              <span className="report-card-label">Total Pendapatan</span>
              <span className="report-card-value">{formatCurrency(report.total_revenue)}</span>
            </div>
          </div>
          <div className="report-card">
            <div className="report-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
            </div>
            <div className="report-card-content">
              <span className="report-card-label">Produk Terjual</span>
              <span className="report-card-value">{report.total_items_sold}</span>
            </div>
          </div>
          <div className="report-card">
            <div className="report-card-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            </div>
            <div className="report-card-content">
              <span className="report-card-label">Estimasi Keuntungan</span>
              <span className="report-card-value">{formatCurrency(report.estimated_profit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section: Chart + Right Panel */}
      <div className="dashboard-bottom">
        {/* Chart */}
        <div className="report-chart-card dashboard-chart">
          <div className="report-chart-header">
            <h3>Performa Penjualan Hari Ini</h3>
            <span className="report-chart-period">Per Jam</span>
          </div>
          <div className="report-chart-container">
            <canvas ref={canvasRef} style={{ width: '100%', height: '280px' }} />
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right-col">
          {/* Best Selling Product */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3>🏆 Produk Terlaris Hari Ini</h3>
            </div>
            <div className="dashboard-card-body">
              {topProduct ? (
                <div className="top-product">
                  <div className="top-product-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <div className="top-product-info">
                    <span className="top-product-name">
                      {topProduct.product_name}
                      {topProduct.variant_name !== 'Default' && <span className="top-product-variant"> — {topProduct.variant_name}</span>}
                    </span>
                    <span className="top-product-sku">{topProduct.sku}</span>
                  </div>
                  <div className="top-product-stats">
                    <span className="top-product-qty">{topProduct.qty_sold} terjual</span>
                    <span className="top-product-rev">{formatCurrency(topProduct.total_revenue)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Belum ada penjualan hari ini
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3>📋 Transaksi Terbaru</h3>
            </div>
            <div className="dashboard-card-body">
              {recentTx.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Belum ada transaksi
                </div>
              ) : (
                <div className="recent-tx-list">
                  {recentTx.map(tx => (
                    <div className="recent-tx-item" key={tx.id}>
                      <div className="recent-tx-info">
                        <span className="recent-tx-invoice">{tx.invoice_number}</span>
                        <span className="recent-tx-date">{tx.created_at}</span>
                      </div>
                      <div className="recent-tx-right">
                        <span className="recent-tx-amount">{formatCurrency(tx.grand_total)}</span>
                        <span className={`status-badge ${statusClass(tx.status)}`}>{statusLabel(tx.status)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="dashboard-view-all" onClick={() => onNavigate('transaction-history')}>
                Lihat Semua Transaksi →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
}

export default DashboardPage;
