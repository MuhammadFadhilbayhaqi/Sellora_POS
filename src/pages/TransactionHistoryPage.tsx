import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { jsPDF } from 'jspdf';
import './CategoryPage.css';
import './ReceiptSettingsPage.css';
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

interface ReceiptSettings {
  headerNote: string;
  footerNote: string;
  showTax: boolean;
  showBusinessName: boolean;
  showBusinessContact: boolean;
  showBusinessEmail: boolean;
  showBusinessCategory: boolean;
  showBusinessAddress: boolean;
  showBusinessLogo: boolean;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_number: string;
  email: string;
  business_category: string;
  address: string;
  logo_base64: string;
}

const DEFAULT_RECEIPT: ReceiptSettings = {
  headerNote: '',
  footerNote: 'Terima kasih atas kunjungan Anda!',
  showTax: true,
  showBusinessName: true,
  showBusinessContact: false,
  showBusinessEmail: false,
  showBusinessCategory: false,
  showBusinessAddress: false,
  showBusinessLogo: false,
};

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

  // Three-dot menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Receipt modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptItems, setReceiptItems] = useState<TransactionItem[]>([]);
  const [receiptPayments, setReceiptPayments] = useState<TransactionPayment[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);

  const loadData = async () => {
    try {
      const data = await invoke<Transaction[]>('get_transaction_history');
      setTransactions(data);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  };

  useEffect(() => {
    loadData();
    invoke<BusinessProfile>('get_business_profile')
      .then(setBusinessProfile)
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenuId]);

  const filtered = transactions.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search && !t.invoice_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const openDetail = async (tx: Transaction) => {
    setActiveMenuId(null);
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

  const openReceipt = async (tx: Transaction) => {
    setActiveMenuId(null);
    setReceiptTx(tx);
    try {
      const [items, payments] = await Promise.all([
        invoke<TransactionItem[]>('get_transaction_items', { transactionId: tx.id }),
        invoke<TransactionPayment[]>('get_transaction_payments', { transactionId: tx.id }),
      ]);
      setReceiptItems(items);
      setReceiptPayments(payments);
      setShowReceiptModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const openRefund = (tx: Transaction) => {
    setActiveMenuId(null);
    setDetailTx(tx);
    setShowRefundModal(true);
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

  // ─── Receipt settings from localStorage ───
  const getReceiptSettings = (): ReceiptSettings => {
    try {
      const saved = localStorage.getItem('receipt_settings');
      if (saved) return { ...DEFAULT_RECEIPT, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_RECEIPT;
  };

  // ─── PDF Download ───
  const downloadReceiptPDF = async () => {
    if (!receiptTx) return;
    const settings = getReceiptSettings();
    const pageWidth = 80;
    const margin = 6;

    const renderReceipt = (doc: InstanceType<typeof jsPDF>) => {
      let y = 10;
      const lineH = 0.55; // line height multiplier (mm per pt)

      const centered = (text: string, size: number, bold = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(text, pageWidth / 2, y, { align: 'center' });
        y += size * lineH;
      };

      const row = (left: string, right: string, size = 8, bold = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(left, margin, y);
        doc.text(right, pageWidth - margin, y, { align: 'right' });
        y += size * lineH;
      };

      const dashedLine = () => {
        y += 2;
        doc.setLineDashPattern([1, 1], 0);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      };

      const boldLine = () => {
        y += 2;
        doc.setLineDashPattern([], 0);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      };

      const formatNum = (n: number) =>
        new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n);

      // Store name
      // Business Logo in PDF
      if (settings.showBusinessLogo && businessProfile?.logo_base64) {
        try {
          const logoWidth = 20;
          const logoHeight = 20;
          doc.addImage(businessProfile.logo_base64, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
          y += logoHeight + 2;
        } catch { /* ignore logo errors */ }
      }

      // Store name - use business name if toggled
      const storeName = settings.showBusinessName && businessProfile?.business_name
        ? businessProfile.business_name.toUpperCase()
        : 'SELLORA POS';
      centered(storeName, 14, true);
      y += 1;

      // Business profile info
      const hasAnyProfileToggle = settings.showBusinessName || settings.showBusinessContact ||
        settings.showBusinessEmail || settings.showBusinessCategory ||
        settings.showBusinessAddress || settings.showBusinessLogo;
      if (hasAnyProfileToggle && businessProfile) {
        if (settings.showBusinessCategory && businessProfile.business_category) {
          centered(businessProfile.business_category, 8);
        }
        if (settings.showBusinessAddress && businessProfile.address) {
          centered(businessProfile.address, 8);
        }
        if (settings.showBusinessContact && businessProfile.contact_number) {
          centered(`Tel: ${businessProfile.contact_number}`, 8);
        }
        if (settings.showBusinessEmail && businessProfile.email) {
          centered(businessProfile.email, 8);
        }
        y += 1;
      }

      // Header note
      if (settings.headerNote) {
        centered(settings.headerNote, 8);
        y += 1;
      }

      dashedLine();

      // Transaction info
      row('No. Invoice', receiptTx.invoice_number, 8);
      y += 1;
      row('Tanggal', receiptTx.created_at.split(' ')[0] || receiptTx.created_at, 8);
      y += 1;
      if (receiptTx.created_at.includes(' ')) {
        row('Waktu', receiptTx.created_at.split(' ')[1] || '', 8);
      }

      dashedLine();

      // Items
      for (const item of receiptItems) {
        const name = [item.product_name, item.variant_name && item.variant_name !== 'Default' ? item.variant_name : '']
          .filter(Boolean).join(' - ');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(name.length > 35 ? name.substring(0, 35) + '...' : name, margin, y);
        y += 4;
        row(
          `${item.quantity} x Rp ${formatNum(item.price)}`,
          `Rp ${formatNum(item.subtotal)}`,
          8
        );
        y += 2;
      }

      dashedLine();

      // Subtotal
      row('Subtotal', formatCurrency(receiptTx.subtotal), 8.5);
      y += 1;

      // Tax
      if (settings.showTax && receiptTx.tax_total > 0) {
        row('Pajak', formatCurrency(receiptTx.tax_total), 8);
        y += 1;
      }

      // Discount
      if (receiptTx.discount_total > 0) {
        row('Diskon', `-${formatCurrency(receiptTx.discount_total)}`, 8);
        y += 1;
      }

      boldLine();

      // Grand total
      row('TOTAL', formatCurrency(receiptTx.grand_total), 10, true);

      dashedLine();

      // Payments
      for (const p of receiptPayments) {
        row(p.method_name || 'Unknown', formatCurrency(p.amount), 8.5);
        const change = p.amount - receiptTx.grand_total;
        if (change > 0) {
          y += 1;
          row('Kembali', formatCurrency(change), 8);
        }
      }

      dashedLine();

      // Footer note
      if (settings.footerNote) {
        y += 1;
        centered(settings.footerNote, 8);
      }

      return y + 8;
    };

    // First pass: measure content height
    const measureDoc = new jsPDF({ unit: 'mm', format: [pageWidth, 300] });
    const totalHeight = renderReceipt(measureDoc);

    // Second pass: render on properly sized page
    const finalDoc = new jsPDF({ unit: 'mm', format: [pageWidth, totalHeight] });
    renderReceipt(finalDoc);

    const pdfBase64 = finalDoc.output('datauristring').split(',')[1];
    try {
      await invoke('save_pdf_file', {
        data: pdfBase64,
        filename: `Struk-${receiptTx.invoice_number}.pdf`,
      });
    } catch (e) {
      console.error('PDF save cancelled or failed:', e);
    }
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
                <th style={{ width: '60px', textAlign: 'center' }}>Aksi</th>
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
                  <td style={{ textAlign: 'center' }}>
                    <div className="action-menu-wrapper" ref={activeMenuId === tx.id ? menuRef : undefined}>
                      <button
                        className={`action-menu-trigger ${activeMenuId === tx.id ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === tx.id ? null : tx.id); }}
                      >
                        ⋮
                      </button>
                      {activeMenuId === tx.id && (
                        <div className="action-menu-dropdown">
                          <button className="action-menu-item menu-detail" onClick={() => openDetail(tx)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            Lihat Detail
                          </button>
                          <button className="action-menu-item menu-receipt" onClick={() => openReceipt(tx)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                            Lihat Struk
                          </button>
                          {tx.status === 'PAID' && (
                            <>
                              <div className="action-menu-separator" />
                              <button className="action-menu-item menu-refund" onClick={() => openRefund(tx)}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                                Refund Transaksi
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Detail Modal (existing, unchanged) */}
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

      {/* Receipt Modal */}
      {showReceiptModal && receiptTx && (() => {
        const settings = getReceiptSettings();
        const datePart = receiptTx.created_at.split(' ')[0] || receiptTx.created_at;
        const timePart = receiptTx.created_at.includes(' ') ? receiptTx.created_at.split(' ')[1] : '';
        return (
          <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <div className="modal-header">
                <h3>Struk {receiptTx.invoice_number}</h3>
                <button className="modal-close" onClick={() => setShowReceiptModal(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', padding: '24px', background: 'var(--main-bg)' }}>
                <div className="receipt-paper" style={{ maxWidth: '280px', width: '100%' }}>
                  <div className="receipt-zigzag top"></div>
                  <div className="receipt-body">
                    {/* Business Logo */}
                    {settings.showBusinessLogo && businessProfile?.logo_base64 && (
                      <div className="receipt-logo">
                        <img src={businessProfile.logo_base64} alt="Logo" />
                      </div>
                    )}

                    {/* Store Name - use business name if toggled on */}
                    <div className="receipt-store-name">
                      {settings.showBusinessName && businessProfile?.business_name
                        ? businessProfile.business_name.toUpperCase()
                        : 'SELLORA POS'}
                    </div>

                    {/* Business Profile Info */}
                    {(settings.showBusinessName || settings.showBusinessContact ||
                      settings.showBusinessEmail || settings.showBusinessCategory ||
                      settings.showBusinessAddress || settings.showBusinessLogo) && businessProfile && (
                      <div className="receipt-business-info">
                        {settings.showBusinessCategory && businessProfile.business_category && (
                          <div className="receipt-business-line">{businessProfile.business_category}</div>
                        )}
                        {settings.showBusinessAddress && businessProfile.address && (
                          <div className="receipt-business-line">{businessProfile.address}</div>
                        )}
                        {settings.showBusinessContact && businessProfile.contact_number && (
                          <div className="receipt-business-line">Tel: {businessProfile.contact_number}</div>
                        )}
                        {settings.showBusinessEmail && businessProfile.email && (
                          <div className="receipt-business-line">{businessProfile.email}</div>
                        )}
                      </div>
                    )}

                    {/* Header Note */}
                    {settings.headerNote && <div className="receipt-header-note">{settings.headerNote}</div>}
                    <div className="receipt-divider"></div>
                    <div className="receipt-info-row"><span>No. Invoice</span><span>{receiptTx.invoice_number}</span></div>
                    <div className="receipt-info-row"><span>Tanggal</span><span>{datePart}</span></div>
                    {timePart && <div className="receipt-info-row"><span>Waktu</span><span>{timePart}</span></div>}
                    <div className="receipt-divider"></div>
                    {receiptItems.map(item => (
                      <div className="receipt-item" key={item.id}>
                        <div className="receipt-item-name">
                          {item.product_name}{item.variant_name && item.variant_name !== 'Default' ? ` - ${item.variant_name}` : ''}
                        </div>
                        <div className="receipt-item-detail">
                          <span>{item.quantity} x {formatCurrency(item.price)}</span>
                          <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="receipt-divider"></div>
                    <div className="receipt-info-row"><span>Subtotal</span><span>{formatCurrency(receiptTx.subtotal)}</span></div>
                    {settings.showTax && receiptTx.tax_total > 0 && (
                      <div className="receipt-info-row receipt-tax-row"><span>Pajak</span><span>{formatCurrency(receiptTx.tax_total)}</span></div>
                    )}
                    {receiptTx.discount_total > 0 && (
                      <div className="receipt-info-row"><span>Diskon</span><span>-{formatCurrency(receiptTx.discount_total)}</span></div>
                    )}
                    <div className="receipt-divider bold"></div>
                    <div className="receipt-info-row receipt-total"><span>TOTAL</span><span>{formatCurrency(receiptTx.grand_total)}</span></div>
                    <div className="receipt-divider"></div>
                    {receiptPayments.map(p => (
                      <div key={p.id}>
                        <div className="receipt-info-row"><span>{p.method_name || 'Unknown'}</span><span>{formatCurrency(p.amount)}</span></div>
                        {p.amount > receiptTx.grand_total && (
                          <div className="receipt-info-row"><span>Kembali</span><span>{formatCurrency(p.amount - receiptTx.grand_total)}</span></div>
                        )}
                      </div>
                    ))}
                    <div className="receipt-divider"></div>
                    {settings.footerNote && <div className="receipt-footer-note">{settings.footerNote}</div>}
                  </div>
                  <div className="receipt-zigzag bottom"></div>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
                <button className="btn-primary" onClick={downloadReceiptPDF} style={{ gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download PDF
                </button>
                <button className="btn-secondary" disabled style={{ gap: '8px', opacity: 0.5, cursor: 'not-allowed' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                  Cetak
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Refund Modal (existing, unchanged) */}
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
