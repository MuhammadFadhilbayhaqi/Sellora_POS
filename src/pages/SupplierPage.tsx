import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

interface Supplier {
  id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  // Form states
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const loadSuppliers = async () => {
    try {
      const data = await invoke<Supplier[]>('get_suppliers');
      setSuppliers(data);
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = suppliers.filter((s) =>
    s.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search)) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const openAdd = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierName(s.supplier_name);
    setContactPerson(s.contact_person || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!supplierName.trim()) {
      setError('Nama supplier harus diisi');
      return;
    }
    setLoading(true);
    setError('');

    const payload = {
      id: editingSupplier ? editingSupplier.id : '',
      supplier_name: supplierName,
      contact_person: contactPerson.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      created_at: '',
      updated_at: '',
    };

    try {
      if (editingSupplier) {
        await invoke('update_supplier', { payload });
      } else {
        await invoke('add_supplier', { payload });
      }
      setShowModal(false);
      await loadSuppliers();
    } catch (e: any) {
      setError(e?.toString() || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_supplier', { id: deleteTarget.id });
      setDeleteTarget(null);
      await loadSuppliers();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="master-page">
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Daftar Supplier</h2>
          <p>Kelola data mitra penyuplai produk Anda</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Supplier
        </button>
      </div>

      <div className="master-page-toolbar">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari nama, PIC, telp, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-info">
          <span className="badge">{filtered.length} supplier</span>
        </div>
      </div>

      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p>Belum ada data supplier</p>
            <span>Klik "Tambah Supplier" untuk memasukkan data mitra penyuplai</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Supplier</th>
                <th>Kontak (PIC)</th>
                <th>Telepon / Email</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((s, idx) => (
                <tr key={s.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon category-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </span>
                      {s.supplier_name}
                    </div>
                  </td>
                  <td>{s.contact_person || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 500 }}>{s.phone || '-'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.email || ''}</span>
                    </div>
                  </td>
                  <td className="td-date">{formatDate(s.created_at)}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Edit" onClick={() => openEdit(s)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn-icon btn-delete" title="Hapus" onClick={() => setDeleteTarget(s)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
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
              <h3>{editingSupplier ? 'Edit Supplier' : 'Tambah Supplier'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Supplier <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Mis. PT Distributor Utama"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nama PIC (Kontak)</label>
                  <input
                    type="text"
                    placeholder="Mis. Budi Santoso"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Mis. 0812xxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Mis. email@distributor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Alamat Lengkap</label>
                <textarea
                  placeholder="Alamat kantor atau gudang supplier"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                ></textarea>
              </div>

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Menyimpan...' : editingSupplier ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Supplier?"
          message={`Anda yakin ingin menghapus supplier "${deleteTarget.supplier_name}"?`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default SupplierPage;
