import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
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

interface InventoryMovement {
  id: string;
  variant_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_id: string;
  notes: string;
  created_at: string;
}

function ReturnPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [returns, setReturns] = useState<InventoryMovement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    try {
      const invData = await invoke<InventoryItem[]>('get_inventory_list');
      setInventory(invData);

      // Get return movements from all variants (we'll collect them)
      const allReturns: InventoryMovement[] = [];
      for (const inv of invData) {
        try {
          const movements = await invoke<InventoryMovement[]>('get_inventory_movements', { variantId: inv.variant_id });
          const retMoves = movements.filter((m) => m.movement_type === 'RETURN');
          allReturns.push(...retMoves);
        } catch { /* skip */ }
      }
      allReturns.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setReturns(allReturns);
    } catch (e) {
      console.error('Failed to load:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getProductLabel = (variantId: string) => {
    const inv = inventory.find((i) => i.variant_id === variantId);
    if (!inv) return variantId;
    return `${inv.product_name}${inv.variant_name !== 'Default' ? ` - ${inv.variant_name}` : ''}`;
  };

  const getProductSku = (variantId: string) => {
    const inv = inventory.find((i) => i.variant_id === variantId);
    return inv?.sku || '';
  };

  const openModal = () => {
    setSelectedVariant('');
    setQty('');
    setReason('');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedVariant) { setError('Pilih produk'); return; }
    if (!qty || parseFloat(qty) <= 0) { setError('Masukkan jumlah > 0'); return; }
    if (!reason.trim()) { setError('Masukkan alasan retur'); return; }

    setLoading(true);
    setError('');
    try {
      await invoke('add_return', {
        variantId: selectedVariant,
        quantity: parseFloat(qty),
        reason,
      });
      setShowModal(false);
      await loadData();
    } catch (e: any) {
      setError(e?.toString() || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Retur</h2>
          <p>Catat pengembalian barang ke stok</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Catat Retur
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="toolbar-info">
          <span className="badge">{returns.length} retur</span>
        </div>
      </div>

      <div className="master-table-card">
        {returns.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
            </div>
            <p>Belum ada data retur</p>
            <span>Klik "Catat Retur" untuk memulai</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Jumlah Retur</th>
                <th>Catatan</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {returns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((r, idx) => (
                <tr key={r.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{getProductLabel(r.variant_id)}</td>
                  <td><span className="td-sku">{getProductSku(r.variant_id)}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--danger)' }}>-{Math.abs(r.quantity)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.notes || '-'}</td>
                  <td className="td-date">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(returns.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={returns.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {/* Add Return Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Catat Retur</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Pilih Produk *</label>
                <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)}>
                  <option value="">-- Pilih Produk --</option>
                  {inventory.map((inv) => (
                    <option key={inv.variant_id} value={inv.variant_id}>
                      {inv.product_name}{inv.variant_name !== 'Default' ? ` - ${inv.variant_name}` : ''} ({inv.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Jumlah Retur *</label>
                <input type="number" placeholder="Jumlah yang dikembalikan" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
              </div>

              <div className="form-group">
                <label>Alasan Retur *</label>
                <textarea placeholder="Contoh: Barang rusak dari customer" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnPage;
