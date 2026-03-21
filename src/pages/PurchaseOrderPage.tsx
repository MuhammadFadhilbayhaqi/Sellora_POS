import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

interface InventoryItem {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
}

interface Supplier {
  id: string;
  supplier_name: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  ordered_at: string;
  received_at: string | null;
  created_at: string;
  supplier_name: string | null;
}

interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  variant_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
}

interface OrderLineInput {
  variant_id: string;
  quantity: number;
  unit_price: number;
  label: string;
}

function PurchaseOrderPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [lines, setLines] = useState<OrderLineInput[]>([]);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [detailItems, setDetailItems] = useState<PurchaseOrderItem[]>([]);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);

  const loadData = async () => {
    try {
      const [ordersData, invData, suppData] = await Promise.all([
        invoke<PurchaseOrder[]>('get_purchase_orders'),
        invoke<InventoryItem[]>('get_inventory_list'),
        invoke<Supplier[]>('get_suppliers'),
      ]);
      setOrders(ordersData);
      setInventory(invData);
      setSuppliers(suppData);
    } catch (e) {
      console.error('Failed to load:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // ─── Add PO ─────────────────────────────────────

  const openAddModal = () => {
    setLines([]);
    setSelectedVariant('');
    setSelectedSupplier('');
    setQuantity('');
    setError('');
    setShowAddModal(true);
  };

  const addLine = () => {
    if (!selectedVariant) return;
    const inv = inventory.find((i) => i.variant_id === selectedVariant);
    if (!inv) return;
    const qty = parseFloat(quantity) || 1;
    // Check if already added
    if (lines.find((l) => l.variant_id === selectedVariant)) {
      setError('Produk sudah ditambahkan');
      return;
    }
    setLines([
      ...lines,
      {
        variant_id: selectedVariant,
        quantity: qty,
        unit_price: inv.cost,
        label: `${inv.product_name}${inv.variant_name !== 'Default' ? ` - ${inv.variant_name}` : ''} (${inv.sku})`,
      },
    ]);
    setSelectedVariant('');
    setQuantity('');
    setError('');
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLineQty = (idx: number, val: number) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], quantity: val };
    setLines(updated);
  };

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  const handleSubmit = async () => {
    if (lines.length === 0) {
      setError('Tambahkan minimal satu item');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await invoke('add_purchase_order', {
        supplierId: selectedSupplier || null,
        items: lines.map((l) => ({
          variant_id: l.variant_id,
          quantity_ordered: l.quantity,
          unit_price: l.unit_price,
        })),
      });
      setShowAddModal(false);
      await loadData();
    } catch (e: any) {
      setError(e?.toString() || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // ─── Detail / Receive ──────────────────────────

  const openDetail = async (order: PurchaseOrder) => {
    setDetailOrder(order);
    try {
      const items = await invoke<PurchaseOrderItem[]>('get_purchase_order_items', { orderId: order.id });
      setDetailItems(items);
    } catch (e) {
      console.error(e);
      setDetailItems([]);
    }
  };

  const handleReceive = async () => {
    if (!receiveTarget) return;
    try {
      await invoke('receive_purchase_order', { orderId: receiveTarget.id });
      setReceiveTarget(null);
      setDetailOrder(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const statusLabel = (status: string) => {
    const m: Record<string, string> = { DRAFT: 'Draft', ORDERED: 'Dipesan', RECEIVED: 'Diterima', CANCELLED: 'Dibatalkan' };
    return m[status] || status;
  };

  const statusClass = (status: string) => {
    if (status === 'RECEIVED') return 'active';
    if (status === 'CANCELLED') return 'inactive';
    return '';
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Pembelian Stok</h2>
          <p>Kelola purchase order untuk pengadaan stok</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Buat Pembelian
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="toolbar-info">
          <span className="badge">{orders.length} order</span>
        </div>
      </div>

      {(() => {
        const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
        const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        return (
      <div className="master-table-card">
        {orders.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            </div>
            <p>Belum ada pembelian</p>
            <span>Klik "Buat Pembelian" untuk menambahkan</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>No. Order</th>
                <th>Supplier</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order, idx) => (
                <tr key={order.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{order.order_number}</td>
                  <td>{order.supplier_name || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(order.total_amount)}</td>
                  <td><span className={`status-badge ${statusClass(order.status)}`}>{statusLabel(order.status)}</span></td>
                  <td className="td-date">{order.ordered_at}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Detail" onClick={() => openDetail(order)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      {order.status === 'ORDERED' && (
                        <button className="btn-icon" title="Terima" style={{ color: 'var(--success)' }} onClick={() => setReceiveTarget(order)}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={orders.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>
        );
      })()}

      {/* ═══════ Add PO Modal ═══════ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Buat Pembelian Stok</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Pilih Supplier</label>
                <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                  <option value="">-- Tidak Memilih Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row" style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'end' }}>
                <div className="form-group">
                  <label>Pilih Produk</label>
                  <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)}>
                    <option value="">-- Pilih Produk --</option>
                    {inventory.map((inv) => (
                      <option key={inv.variant_id} value={inv.variant_id}>
                        {inv.product_name}{inv.variant_name !== 'Default' ? ` - ${inv.variant_name}` : ''} ({inv.sku}) — Harga beli: {formatCurrency(inv.cost)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ width: '100px' }}>
                  <label>Qty</label>
                  <input type="number" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" />
                </div>
                <button className="btn-primary" style={{ height: '42px', marginBottom: '18px' }} onClick={addLine}>+</button>
              </div>

              {lines.length > 0 && (
                <table className="master-table" style={{ marginTop: '12px' }}>
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Qty</th>
                      <th>Harga Beli</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.variant_id}>
                        <td style={{ fontSize: '13px' }}>{l.label}</td>
                        <td>
                          <input type="number" value={l.quantity} onChange={(e) => updateLineQty(i, parseFloat(e.target.value) || 0)} min="1" style={{ width: '70px', padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }} />
                        </td>
                        <td>{formatCurrency(l.unit_price)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(l.quantity * l.unit_price)}</td>
                        <td>
                          <button className="btn-icon btn-delete" onClick={() => removeLine(i)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {lines.length > 0 && (
                <div style={{ textAlign: 'right', marginTop: '16px', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                  Total: {formatCurrency(totalAmount)}
                </div>
              )}

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Batal</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Buat Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Detail Modal ═══════ */}
      {detailOrder && (
        <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail {detailOrder.order_number}</h3>
              <button className="modal-close" onClick={() => setDetailOrder(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span className={`status-badge ${statusClass(detailOrder.status)}`}>{statusLabel(detailOrder.status)}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tanggal: {detailOrder.ordered_at}</span>
                {detailOrder.received_at && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Diterima: {detailOrder.received_at}</span>}
              </div>
              <table className="master-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Qty Pesan</th>
                    <th>Qty Terima</th>
                    <th>Harga</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((di) => (
                    <tr key={di.id}>
                      <td style={{ fontSize: '13px' }}>{di.product_name} {di.variant_name && di.variant_name !== 'Default' ? `- ${di.variant_name}` : ''}</td>
                      <td><span className="td-sku">{di.sku}</span></td>
                      <td>{di.quantity_ordered}</td>
                      <td>{di.quantity_received}</td>
                      <td>{formatCurrency(di.unit_price)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(di.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', marginTop: '16px', fontWeight: 700, fontSize: '16px' }}>
                Total: {formatCurrency(detailOrder.total_amount)}
              </div>
            </div>
          </div>
        </div>
      )}

      {receiveTarget && (
        <ConfirmDialog
          title="Terima Purchase Order?"
          message={`Apakah Anda yakin ingin menerima ${receiveTarget.order_number}? Stok akan bertambah sesuai jumlah pesanan.`}
          confirmText="Ya, Terima"
          cancelText="Batal"
          onConfirm={handleReceive}
          onCancel={() => setReceiveTarget(null)}
        />
      )}
    </div>
  );
}

export default PurchaseOrderPage;
