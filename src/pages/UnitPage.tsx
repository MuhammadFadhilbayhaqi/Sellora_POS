import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

interface Unit {
  id: string;
  unit_name: string;
  unit_symbol: string;
  created_at: string;
  updated_at: string;
}

function UnitPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formName, setFormName] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

  const loadUnits = async () => {
    try {
      const data = await invoke<Unit[]>('get_units');
      setUnits(data);
    } catch (e) {
      console.error('Failed to load units:', e);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const filtered = units.filter(
    (u) =>
      u.unit_name.toLowerCase().includes(search.toLowerCase()) ||
      u.unit_symbol.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const openAdd = () => {
    setEditingUnit(null);
    setFormName('');
    setFormSymbol('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormName(unit.unit_name);
    setFormSymbol(unit.unit_symbol);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      setError('Nama unit harus diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (editingUnit) {
        await invoke('update_unit', {
          id: editingUnit.id,
          unitName: formName,
          unitSymbol: formSymbol,
        });
      } else {
        await invoke('add_unit', {
          unitName: formName,
          unitSymbol: formSymbol,
        });
      }
      setShowModal(false);
      await loadUnits();
    } catch (e: any) {
      setError(e?.toString() || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_unit', { id: deleteTarget.id });
      setDeleteTarget(null);
      await loadUnits();
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
      {/* Header */}
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Satuan Produk</h2>
          <p>Kelola satuan untuk mengukur produk Anda</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Satuan
        </button>
      </div>

      {/* Search */}
      <div className="master-page-toolbar">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari satuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-info">
          <span className="badge">{filtered.length} satuan</span>
        </div>
      </div>

      {/* Table */}
      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3z" />
                <path d="M14 3h7v7h-7z" />
                <path d="M14 14h7v7h-7z" />
                <path d="M3 14h7v7H3z" />
              </svg>
            </div>
            <p>Belum ada satuan</p>
            <span>Klik "Tambah Satuan" untuk menambahkan</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Satuan</th>
                <th>Simbol</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((unit, idx) => (
                <tr key={unit.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon unit-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3h7v7H3z" />
                          <path d="M14 3h7v7h-7z" />
                          <path d="M14 14h7v7h-7z" />
                          <path d="M3 14h7v7H3z" />
                        </svg>
                      </span>
                      {unit.unit_name}
                    </div>
                  </td>
                  <td>
                    <span className="td-sku">{unit.unit_symbol || '-'}</span>
                  </td>
                  <td className="td-date">{formatDate(unit.created_at)}</td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Edit" onClick={() => openEdit(unit)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn-icon btn-delete" title="Hapus" onClick={() => setDeleteTarget(unit)}>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUnit ? 'Edit Satuan' : 'Tambah Satuan'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Nama Satuan</label>
                  <input
                    type="text"
                    placeholder="contoh: Kilogram"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Simbol</label>
                  <input
                    type="text"
                    placeholder="contoh: kg"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Menyimpan...' : editingUnit ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Satuan?"
          message={`Anda yakin ingin menghapus satuan "${deleteTarget.unit_name}"?`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default UnitPage;
