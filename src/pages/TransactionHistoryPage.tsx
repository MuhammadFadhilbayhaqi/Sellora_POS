import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import Pagination from '../components/Pagination';

interface Transaction {
  id: string;
  invoice_number: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TransactionItem {
  id: string;
  variant_id: string;
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  discount: number;
  tax: number;
  subtotal: number;
}

interface TransactionPayment {
  id: string;
  method_name: string | null;
  amount: number;
  reference_number: string;
  paid_at: string;
}

function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailItems, setDetailItems] = useState<TransactionItem[]>([]);
  const [detailPayments, setDetailPayments] = useState<TransactionPayment[]>([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  const loadData = async () => {
    try {
      const data = await invoke<Transaction[]>('get_transaction_history');
      setTransactions(data);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = transactions.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search && !t.invoice_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const openDetail = async (tx: Transaction) => {
    setDetailTx(tx);
    try {
      const [items, payments] = await Promise.all([
        invoke<TransactionItem[]>('get_transaction_items', { transactionId: tx.id }),
        invoke<TransactionPayment[]>('get_transaction_payments', { transactionId: tx.id }),
      ]);
      setDetailItems(items);
      setDetailPayments(payments);
    } catch (e) {
      console.error(e);
      setDetailItems([]);
      setDetailPayments([]);
    }
  };

  const handleRefund = async () => {
    if (!detailTx || !refundReason.trim()) return;
    setRefundLoading(true);
    try {
      await invoke('refund_transaction', { transactionId: detailTx.id, refundReason });
      setShowRefundModal(false);
      setRefundReason('');
      setDetailTx(null);
      await loadData();
    } catch (e) {
      console.error('Refund failed:', e);
    } finally {
      setRefundLoading(false);
    }
  };

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

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Riwayat Transaksi</h2>
          <p>Lihat semua riwayat transaksi kasir</p>
        </div>
      </div>

      <div className="master-page-toolbar">
        <div className="toolbar-left" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" placeholder="Cari no. invoice..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit', background: 'var(--card-bg)', color: 'var(--text-primary)' }}>
            <option value="ALL">Semua Status</option>
            <option value="PAID">Lunas</option>
            <option value="CANCELLED">Dibatalkan</option>
            <option value="REFUNDED">Refund</option>
            <option value="HOLD">Ditahan</option>
          </select>
        </div>
        <div className="toolbar-info"><span className="badge">{filtered.length} transaksi</span></div>
      </div>

      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <p>Belum ada transaksi</p>
            <span>Transaksi akan muncul setelah Anda melakukan penjualan di kasir</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>No. Invoice</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((tx, idx) => (
                <tr key={tx.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{tx.invoice_number}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(tx.grand_total)}</td>
                  <td><span className={`status-badge ${statusClass(tx.status)}`}>{statusLabel(tx.status)}</span></td>
                  <td className="td-date">{tx.created_at}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Detail" onClick={() => openDetail(tx)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      {tx.status === 'PAID' && (
                        <button className="btn-icon btn-delete" title="Refund" onClick={() => { setDetailTx(tx); setShowRefundModal(true); }}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {/* Detail Modal */}
      {detailTx && !showRefundModal && (
        <div className="modal-overlay" onClick={() => setDetailTx(null)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail {detailTx.invoice_number}</h3>
              <button className="modal-close" onClick={() => setDetailTx(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span className={`status-badge ${statusClass(detailTx.status)}`}>{statusLabel(detailTx.status)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tanggal: {detailTx.created_at}</span>
              </div>
              <table className="master-table">
                <thead>
                  <tr><th>Produk</th><th>SKU</th><th>Harga</th><th>Qty</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {detailItems.map(di => (
                    <tr key={di.id}>
                      <td style={{ fontSize: '13px' }}>{di.product_name} {di.variant_name && di.variant_name !== 'Default' ? `- ${di.variant_name}` : ''}</td>
                      <td><span className="td-sku">{di.sku}</span></td>
                      <td>{formatCurrency(di.price)}</td>
                      <td>{di.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(di.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Subtotal: {formatCurrency(detailTx.subtotal)}</span>
                {detailTx.tax_total > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pajak: {formatCurrency(detailTx.tax_total)}</span>}
                {detailTx.discount_total > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Diskon: -{formatCurrency(detailTx.discount_total)}</span>}
                <span style={{ fontWeight: 700, fontSize: '16px' }}>Grand Total: {formatCurrency(detailTx.grand_total)}</span>
              </div>
              {detailPayments.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Pembayaran</h4>
                  {detailPayments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span>{p.method_name || 'Unknown'} {p.reference_number ? `(${p.reference_number})` : ''}</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && detailTx && (
        <div className="modal-overlay" onClick={() => { setShowRefundModal(false); setRefundReason(''); }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Refund {detailTx.invoice_number}</h3>
              <button className="modal-close" onClick={() => { setShowRefundModal(false); setRefundReason(''); }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Jumlah refund: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(detailTx.grand_total)}</strong></p>
              <div className="form-group">
                <label>Alasan Refund <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea placeholder="Jelaskan alasan refund..." value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={3}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowRefundModal(false); setRefundReason(''); }}>Batal</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={handleRefund} disabled={refundLoading || !refundReason.trim()}>
                {refundLoading ? 'Memproses...' : 'Konfirmasi Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionHistoryPage;
