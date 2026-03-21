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

interface InventoryAdjustment {
  id: string;
  variant_id: string;
  old_quantity: number;
  new_quantity: number;
  difference: number;
  reason: string;
  adjusted_by: string | null;
  created_at: string;
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
}

function StockOpnamePage() {
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    try {
      const [adjData, invData] = await Promise.all([
        invoke<InventoryAdjustment[]>('get_adjustments'),
        invoke<InventoryItem[]>('get_inventory_list'),
      ]);
      setAdjustments(adjData);
      setInventory(invData);
    } catch (e) {
      console.error('Failed to load:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectedInv = inventory.find((i) => i.variant_id === selectedVariant);

  const openModal = () => {
    setSelectedVariant('');
    setNewQty('');
    setReason('');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedVariant) { setError('Pilih produk'); return; }
    if (newQty === '') { setError('Masukkan jumlah baru'); return; }
    if (!reason.trim()) { setError('Masukkan alasan'); return; }

    setLoading(true);
    setError('');
    try {
      await invoke('add_adjustment', {
        variantId: selectedVariant,
        newQuantity: parseFloat(newQty) || 0,
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
          <h2>Stock Opname</h2>
          <p>Penyesuaian stok berdasarkan penghitungan fisik</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Stock Opname
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="toolbar-info">
          <span className="badge">{adjustments.length} penyesuaian</span>
        </div>
      </div>

      <div className="master-table-card">
        {adjustments.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </div>
            <p>Belum ada stock opname</p>
            <span>Klik "Stock Opname" untuk memulai</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Stok Lama</th>
                <th>Stok Baru</th>
                <th>Selisih</th>
                <th>Alasan</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((adj, idx) => (
                <tr key={adj.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <div>
                        <div>{adj.product_name}</div>
                        {adj.variant_name && adj.variant_name !== 'Default' && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{adj.variant_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span className="td-sku">{adj.sku}</span></td>
                  <td>{adj.old_quantity}</td>
                  <td style={{ fontWeight: 600 }}>{adj.new_quantity}</td>
                  <td style={{ fontWeight: 600, color: adj.difference >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {adj.difference >= 0 ? '+' : ''}{adj.difference}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{adj.reason}</td>
                  <td className="td-date">{adj.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(adjustments.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={adjustments.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {/* Add Stock Opname Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Stock Opname</h3>
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
                      {inv.product_name}{inv.variant_name !== 'Default' ? ` - ${inv.variant_name}` : ''} ({inv.sku}) — Stok: {inv.quantity}
                    </option>
                  ))}
                </select>
              </div>

              {selectedInv && (
                <div className="toggle-group" style={{ marginBottom: '18px' }}>
                  <div className="toggle-group-info">
                    <span>Stok Saat Ini</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>{selectedInv.quantity}</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Jumlah Stok Baru (Hasil Hitung Fisik) *</label>
                <input type="number" placeholder="Masukkan jumlah baru" value={newQty} onChange={(e) => setNewQty(e.target.value)} min="0" />
              </div>

              <div className="form-group">
                <label>Alasan Penyesuaian *</label>
                <textarea placeholder="Contoh: Selisih saat hitung fisik" value={reason} onChange={(e) => setReason(e.target.value)} />
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

export default StockOpnamePage;
