import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import './SalesReportPage.css';

interface ReportData {
  total_transactions: number;
  total_revenue: number;
  total_tax: number;
  total_items_sold: number;
  estimated_profit: number;
  chart_labels: string[];
  chart_values: number[];
}

function SalesReportPage() {
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]); // 2026-03-18
  const [report, setReport] = useState<ReportData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dateForPeriod = useCallback(() => {
    if (period === 'daily') return date;
    if (period === 'monthly') return date.slice(0, 7);
    return date.slice(0, 4);
  }, [period, date]);

  const loadData = useCallback(async () => {
    try {
      const data = await invoke<ReportData>('get_sales_report', { period, date: dateForPeriod() });
      setReport(data);
    } catch (e) {
      console.error('Failed to load report:', e);
    }
  }, [period, dateForPeriod]);

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
      ctx.fillText('Belum ada data penjualan', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...values, 1);
    const barWidth = Math.min(40, (chartW / labels.length) * 0.6);
    const gap = chartW / labels.length;

    // Grid lines
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

    // Bars with gradient
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

      // X label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, padding.left + gap * i + gap / 2, h - padding.bottom + 20);
    });
  }, [report]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const periodLabel = () => {
    if (period === 'daily') return 'Harian — Per Jam';
    if (period === 'monthly') return 'Bulanan — Per Hari';
    return 'Tahunan — Per Bulan';
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Laporan Penjualan</h2>
          <p>Ringkasan performa penjualan toko</p>
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

      {/* Chart */}
      <div className="report-chart-card">
        <div className="report-chart-header">
          <h3>Grafik Penjualan</h3>
          <span className="report-chart-period">{periodLabel()}</span>
        </div>
        <div className="report-chart-container">
          <canvas ref={canvasRef} style={{ width: '100%', height: '300px' }} />
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

export default SalesReportPage;
