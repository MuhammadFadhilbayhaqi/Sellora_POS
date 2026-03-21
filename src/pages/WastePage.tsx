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

interface InventoryWaste {
  id: string;
  variant_id: string;
  quantity: number;
  waste_type: string;
  reason: string;
  reported_by: string | null;
  created_at: string;
  product_name: string | null;
  variant_name: string | null;
  sku: string | null;
}

const WASTE_TYPES = [
  { value: 'EXPIRED', label: 'Kadaluarsa' },
  { value: 'DAMAGED', label: 'Rusak' },
  { value: 'SPILL', label: 'Tumpah' },
  { value: 'LOST', label: 'Hilang' },
  { value: 'QUALITY_REJECT', label: 'Reject Kualitas' },
  { value: 'COOKING_WASTE', label: 'Sisa Masak' },
];

function WastePage() {
  const [wasteList, setWasteList] = useState<InventoryWaste[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [qty, setQty] = useState('');
  const [wasteType, setWasteType] = useState('DAMAGED');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    try {
      const [wasteData, invData] = await Promise.all([
        invoke<InventoryWaste[]>('get_waste'),
        invoke<InventoryItem[]>('get_inventory_list'),
      ]);
      setWasteList(wasteData);
      setInventory(invData);
    } catch (e) {
      console.error('Failed to load:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openModal = () => {
    setSelectedVariant('');
    setQty('');
    setWasteType('DAMAGED');
    setReason('');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedVariant) { setError('Pilih produk'); return; }
    if (!qty || parseFloat(qty) <= 0) { setError('Masukkan jumlah > 0'); return; }

    setLoading(true);
    setError('');
    try {
      await invoke('add_waste', {
        variantId: selectedVariant,
        quantity: parseFloat(qty),
        wasteType,
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

  const wasteLabel = (type: string) => {
    const found = WASTE_TYPES.find((w) => w.value === type);
    return found?.label || type;
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Stok Terbuang</h2>
          <p>Catat stok yang hilang, rusak, atau kadaluarsa</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Catat Stok Terbuang
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="toolbar-info">
          <span className="badge">{wasteList.length} catatan</span>
        </div>
      </div>

      <div className="master-table-card">
        {wasteList.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
            <p>Belum ada data stok terbuang</p>
            <span>Klik "Catat Stok Terbuang" untuk memulai</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Jumlah</th>
                <th>Tipe</th>
                <th>Alasan</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {wasteList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((w, idx) => (
                <tr key={w.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <div>
                        <div>{w.product_name}</div>
                        {w.variant_name && w.variant_name !== 'Default' && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{w.variant_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span className="td-sku">{w.sku}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--danger)' }}>-{w.quantity}</td>
                  <td><span className="status-badge inactive">{wasteLabel(w.waste_type)}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{w.reason || '-'}</td>
                  <td className="td-date">{w.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={Math.ceil(wasteList.length / ITEMS_PER_PAGE)} onPageChange={setCurrentPage} totalItems={wasteList.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {/* Add Waste Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Catat Stok Terbuang</h3>
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

              <div className="form-group">
                <label>Jumlah *</label>
                <input type="number" placeholder="Jumlah yang terbuang" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
              </div>

              <div className="form-group">
                <label>Tipe *</label>
                <select value={wasteType} onChange={(e) => setWasteType(e.target.value)}>
                  {WASTE_TYPES.map((wt) => (
                    <option key={wt.value} value={wt.value}>{wt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Alasan</label>
                <textarea placeholder="Deskripsi alasan (opsional)" value={reason} onChange={(e) => setReason(e.target.value)} />
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

export default WastePage;
