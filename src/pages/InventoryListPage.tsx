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

function InventoryListPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [movementTarget, setMovementTarget] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const loadData = async () => {
    try {
      const data = await invoke<InventoryItem[]>('get_inventory_list');
      setItems(data);
    } catch (e) {
      console.error('Failed to load inventory:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = items.filter(
    (i) =>
      i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.variant_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const openMovements = async (item: InventoryItem) => {
    setMovementTarget(item);
    setLoadingMovements(true);
    try {
      const data = await invoke<InventoryMovement[]>('get_inventory_movements', {
        variantId: item.variant_id,
      });
      setMovements(data);
    } catch (e) {
      console.error('Failed to load movements:', e);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const movementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: 'Pembelian',
      SALE: 'Penjualan',
      ADJUSTMENT: 'Stock Opname',
      RETURN: 'Retur',
      WASTE: 'Terbuang',
      DAMAGE: 'Rusak',
    };
    return labels[type] || type;
  };

  const movementTypeClass = (type: string) => {
    if (['PURCHASE'].includes(type)) return 'movement-in';
    return 'movement-out';
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Daftar Stok</h2>
          <p>Lihat stok semua produk beserta harga dan riwayat</p>
        </div>
      </div>

      <div className="master-page-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Cari produk, SKU, atau variant..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="toolbar-info">
          <span className="badge">{filtered.length} item</span>
        </div>
      </div>

      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <p>Belum ada data stok</p>
            <span>Tambahkan produk terlebih dahulu</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Harga Jual</th>
                <th>Harga Beli</th>
                <th>Stok</th>
                <th>Total Modal</th>
                <th>Riwayat</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={item.variant_id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon product-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </span>
                      <div>
                        <div>{item.product_name}</div>
                        {item.variant_name !== 'Default' && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {item.variant_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span className="td-sku">{item.sku}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(item.price)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.cost)}</td>
                  <td>
                    <span className={`badge ${item.quantity <= 0 ? 'badge-danger' : item.quantity <= 5 ? 'badge-warning' : ''}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatCurrency(item.cost * item.quantity)}</td>
                  <td>
                    <button className="btn-icon btn-edit" title="Lihat Riwayat" onClick={() => openMovements(item)}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {filtered.length > 0 && (
        <div className="inventory-summary-row">
          <div className="inventory-summary-card">
            <div className="inventory-summary-header">
              <div className="inventory-summary-icon page-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <span className="inventory-summary-label">Halaman Ini</span>
            </div>
            <div className="inventory-summary-stats">
              <div className="inventory-summary-stat">
                <span className="stat-label">Total Stok</span>
                <span className="stat-value">{paginatedData.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="inventory-summary-divider" />
              <div className="inventory-summary-stat">
                <span className="stat-label">Total Modal</span>
                <span className="stat-value stat-currency">{formatCurrency(paginatedData.reduce((sum, i) => sum + i.cost * i.quantity, 0))}</span>
              </div>
            </div>
          </div>

          <div className="inventory-summary-card summary-card-primary">
            <div className="inventory-summary-header">
              <div className="inventory-summary-icon all-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <span className="inventory-summary-label">Semua Barang</span>
            </div>
            <div className="inventory-summary-stats">
              <div className="inventory-summary-stat">
                <span className="stat-label">Total Stok</span>
                <span className="stat-value">{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="inventory-summary-divider" />
              <div className="inventory-summary-stat">
                <span className="stat-label">Total Modal</span>
                <span className="stat-value stat-currency">{formatCurrency(items.reduce((sum, i) => sum + i.cost * i.quantity, 0))}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movement History Popup */}
      {movementTarget && (
        <div className="modal-overlay" onClick={() => setMovementTarget(null)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Riwayat Stok — {movementTarget.product_name} {movementTarget.variant_name !== 'Default' ? `(${movementTarget.variant_name})` : ''}</h3>
              <button className="modal-close" onClick={() => setMovementTarget(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingMovements ? (
                <div className="table-empty"><p>Memuat...</p></div>
              ) : movements.length === 0 ? (
                <div className="table-empty">
                  <p>Belum ada riwayat pergerakan stok</p>
                </div>
              ) : (
                <table className="master-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Tipe</th>
                      <th>Jumlah</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="td-date">{m.created_at}</td>
                        <td>
                          <span className={`status-badge ${movementTypeClass(m.movement_type)}`}>
                            {movementTypeLabel(m.movement_type)}
                          </span>
                        </td>
                        <td
                          style={{
                            fontWeight: 600,
                            color: m.quantity < 0 ? 'var(--danger)' : 'var(--success)'
                          }}
                        >
                          {m.quantity < 0 ? `${m.quantity}` : `+${m.quantity}`}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{m.notes || '-'}</td>
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

export default InventoryListPage;
