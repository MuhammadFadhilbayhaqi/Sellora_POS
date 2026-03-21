import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

interface Tax {
  id: string;
  tax_name: string;
  tax_rate: number;
  tax_type: string;
  status: string;
  created_at: string;
}

function TaxPage() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tax | null>(null);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [taxType, setTaxType] = useState('PERCENTAGE');
  const [taxStatus, setTaxStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tax | null>(null);

  const loadData = async () => {
    try {
      const data = await invoke<Tax[]>('get_taxes');
      setTaxes(data);
    } catch (e) {
      console.error('Failed to load taxes:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = taxes.filter((t) =>
    t.tax_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const openAdd = () => {
    setEditing(null);
    setTaxName('');
    setTaxRate('');
    setTaxType('PERCENTAGE');
    setTaxStatus('active');
    setError('');
    setShowModal(true);
  };

  const openEdit = (t: Tax) => {
    setEditing(t);
    setTaxName(t.tax_name);
    setTaxRate(String(t.tax_rate));
    setTaxType(t.tax_type);
    setTaxStatus(t.status);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!taxName.trim()) { setError('Nama pajak harus diisi'); return; }
    if (!taxRate || parseFloat(taxRate) <= 0) { setError('Rate pajak harus lebih dari 0'); return; }
    setLoading(true); setError('');
    try {
      const payload = { id: editing ? editing.id : '', tax_name: taxName, tax_rate: parseFloat(taxRate), tax_type: taxType, status: taxStatus, created_at: '' };
      if (editing) {
        await invoke('update_tax', { payload });
      } else {
        await invoke('add_tax', { payload });
      }
      setShowModal(false);
      await loadData();
    } catch (e: any) { setError(e?.toString() || 'Terjadi kesalahan'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_tax', { id: deleteTarget.id });
      setDeleteTarget(null);
      await loadData();
    } catch (e) { console.error('Failed to delete:', e); }
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Pengaturan Pajak</h2>
          <p>Kelola pajak yang otomatis diterapkan pada setiap transaksi</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Tambah Pajak
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Cari pajak..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-info"><span className="badge">{filtered.length} pajak</span></div>
      </div>

      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <p>Belum ada data pajak</p>
            <span>Klik "Tambah Pajak" untuk menambahkan</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Pajak</th>
                <th>Rate</th>
                <th>Tipe</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((t, idx) => (
                <tr key={t.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon category-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      </span>
                      {t.tax_name}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{t.tax_type === 'PERCENTAGE' ? `${t.tax_rate}%` : `Rp ${t.tax_rate}`}</td>
                  <td><span className="badge">{t.tax_type === 'PERCENTAGE' ? 'Persentase' : 'Nominal'}</span></td>
                  <td><span className={`status-badge ${t.status === 'active' ? 'active' : 'inactive'}`}>{t.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Edit" onClick={() => openEdit(t)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="btn-icon btn-delete" title="Hapus" onClick={() => setDeleteTarget(t)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={ITEMS_PER_PAGE} />
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Pajak' : 'Tambah Pajak'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Pajak <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" placeholder="Mis. PPN, PB1" value={taxName} onChange={(e) => setTaxName(e.target.value)} autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rate <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="number" placeholder="Mis. 11" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label>Tipe</label>
                  <select value={taxType} onChange={(e) => setTaxType(e.target.value)}>
                    <option value="PERCENTAGE">Persentase (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={taxStatus} onChange={(e) => setTaxStatus(e.target.value)}>
                  <option value="active">Aktif — Otomatis diterapkan di kasir</option>
                  <option value="inactive">Nonaktif — Tidak diterapkan</option>
                </select>
              </div>
              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Menyimpan...' : editing ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog title="Hapus Pajak?" message={`Anda yakin ingin menghapus pajak "${deleteTarget.tax_name}"?`} confirmText="Ya, Hapus" cancelText="Batal" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

export default TaxPage;
