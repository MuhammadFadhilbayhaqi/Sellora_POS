import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

interface PaymentMethod {
  id: string;
  method_name: string;
  type: string;
  status: string;
  created_at: string;
}

function PaymentMethodPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [methodName, setMethodName] = useState('');
  const [methodType, setMethodType] = useState('CASH');
  const [methodStatus, setMethodStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);

  const loadData = async () => {
    try {
      const data = await invoke<PaymentMethod[]>('get_payment_methods');
      setMethods(data);
    } catch (e) {
      console.error('Failed to load payment methods:', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = methods.filter((m) =>
    m.method_name.toLowerCase().includes(search.toLowerCase()) ||
    m.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const openAdd = () => {
    setEditing(null);
    setMethodName('');
    setMethodType('CASH');
    setMethodStatus('active');
    setError('');
    setShowModal(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setMethodName(m.method_name);
    setMethodType(m.type);
    setMethodStatus(m.status);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!methodName.trim()) { setError('Nama metode harus diisi'); return; }
    setLoading(true); setError('');
    try {
      if (editing) {
        await invoke('update_payment_method', { payload: { id: editing.id, method_name: methodName, type: methodType, status: methodStatus, created_at: '' } });
      } else {
        await invoke('add_payment_method', { payload: { id: '', method_name: methodName, type: methodType, status: methodStatus, created_at: '' } });
      }
      setShowModal(false);
      await loadData();
    } catch (e: any) { setError(e?.toString() || 'Terjadi kesalahan'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_payment_method', { id: deleteTarget.id });
      setDeleteTarget(null);
      await loadData();
    } catch (e) { console.error('Failed to delete:', e); }
  };

  const typeLabel = (t: string) => {
    const m: Record<string, string> = { CASH: 'Tunai', DEBIT: 'Debit', CREDIT: 'Kredit', EWALLET: 'E-Wallet', QRIS: 'QRIS', TRANSFER: 'Transfer' };
    return m[t] || t;
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Metode Pembayaran</h2>
          <p>Kelola metode pembayaran yang tersedia di kasir</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Tambah Metode
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" placeholder="Cari metode pembayaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-info"><span className="badge">{filtered.length} metode</span></div>
      </div>

      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            </div>
            <p>Belum ada metode pembayaran</p>
            <span>Klik "Tambah Metode" untuk menambahkan</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Metode</th>
                <th>Tipe</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((m, idx) => (
                <tr key={m.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon category-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                      </span>
                      {m.method_name}
                    </div>
                  </td>
                  <td><span className="badge">{typeLabel(m.type)}</span></td>
                  <td><span className={`status-badge ${m.status === 'active' ? 'active' : 'inactive'}`}>{m.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Edit" onClick={() => openEdit(m)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="btn-icon btn-delete" title="Hapus" onClick={() => setDeleteTarget(m)}>
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
              <h3>{editing ? 'Edit Metode' : 'Tambah Metode Pembayaran'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Metode <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" placeholder="Mis. Cash, BCA Debit, GoPay" value={methodName} onChange={(e) => setMethodName(e.target.value)} autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipe</label>
                  <select value={methodType} onChange={(e) => setMethodType(e.target.value)}>
                    <option value="CASH">Tunai</option>
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Kredit</option>
                    <option value="EWALLET">E-Wallet</option>
                    <option value="QRIS">QRIS</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={methodStatus} onChange={(e) => setMethodStatus(e.target.value)}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
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
        <ConfirmDialog title="Hapus Metode?" message={`Anda yakin ingin menghapus metode "${deleteTarget.method_name}"?`} confirmText="Ya, Hapus" cancelText="Batal" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

export default PaymentMethodPage;
