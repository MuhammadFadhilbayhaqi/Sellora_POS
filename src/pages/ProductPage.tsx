import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CategoryPage.css';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

interface Product {
  id: string;
  sku: string;
  product_name: string;
  category_id: string | null;
  unit_id: string | null;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  unit_name: string | null;
  variant_count: number | null;
}

interface Category {
  id: string;
  category_name: string;
}

interface Unit {
  id: string;
  unit_name: string;
  unit_symbol: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string;
  barcode: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface VariantInput {
  variant_name: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
}

function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCustomSku, setFormCustomSku] = useState('');
  const [useCustomSku, setUseCustomSku] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [formBarcode, setFormBarcode] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [variants, setVariants] = useState<VariantInput[]>([
    { variant_name: '', sku: '', barcode: '', price: 0, cost: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Product Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const loadData = async () => {
    try {
      const [productsData, categoriesData, unitsData] = await Promise.all([
        invoke<Product[]>('get_products'),
        invoke<Category[]>('get_categories'),
        invoke<Unit[]>('get_units'),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filterCategory || p.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, filterCategory]);

  // ─── Barcode Generator ──────────────────────────

  const generateBarcode = async (): Promise<string> => {
    try {
      return await invoke<string>('gen_barcode');
    } catch {
      return '';
    }
  };

  const handleGenerateMainBarcode = async () => {
    const bc = await generateBarcode();
    setFormBarcode(bc);
  };

  const handleGenerateVariantBarcode = async (index: number) => {
    const bc = await generateBarcode();
    updateVariant(index, 'barcode', bc);
  };

  const handleGenerateEditVariantBarcode = async (index: number) => {
    const bc = await generateBarcode();
    const updated = [...editVariants];
    updated[index] = { ...updated[index], barcode: bc };
    setEditVariants(updated);
  };

  // ─── Add Product ─────────────────────────────────

  const openAddModal = () => {
    setFormName('');
    setFormCategory('');
    setFormUnit('');
    setFormDescription('');
    setFormCustomSku('');
    setUseCustomSku(false);
    setHasVariants(false);
    setFormBarcode('');
    setFormPrice('');
    setFormCost('');
    setVariants([{ variant_name: '', sku: '', barcode: '', price: 0, cost: 0 }]);
    setError('');
    setShowAddModal(true);
  };

  const addVariantRow = () => {
    setVariants([...variants, { variant_name: '', sku: '', barcode: '', price: 0, cost: 0 }]);
  };

  const updateVariant = (index: number, field: keyof VariantInput, value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    if (!formName.trim()) {
      setError('Nama produk harus diisi');
      return;
    }
    if (hasVariants) {
      const validVariants = variants.filter((v) => v.variant_name.trim());
      if (validVariants.length === 0) {
        setError('Minimal satu variant harus diisi');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const validVariants = variants.filter((v) => v.variant_name.trim());
      await invoke('add_product', {
        productName: formName,
        categoryId: formCategory || null,
        unitId: formUnit || null,
        description: formDescription,
        customSku: useCustomSku ? formCustomSku : null,
        hasVariants,
        variants: hasVariants ? validVariants : null,
        barcode: !hasVariants ? formBarcode : null,
        price: !hasVariants ? parseFloat(formPrice) || 0 : null,
        cost: !hasVariants ? parseFloat(formCost) || 0 : null,
      });
      setShowAddModal(false);
      await loadData();
    } catch (e: any) {
      setError(e?.toString() || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit Product ────────────────────────────────

  const openEditModal = async (product: Product) => {
    setEditingProduct(product);
    setEditName(product.product_name);
    setEditCategory(product.category_id || '');
    setEditUnit(product.unit_id || '');
    setEditDescription(product.description);
    setEditStatus(product.status);
    setError('');
    setShowEditModal(true);

    // Load variants for this product
    try {
      const variantsData = await invoke<ProductVariant[]>('get_product_variants', {
        productId: product.id,
      });
      setEditVariants(variantsData);
    } catch (e) {
      console.error('Failed to load variants:', e);
      setEditVariants([]);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct || !editName.trim()) {
      setError('Nama produk harus diisi');
      return;
    }

    setEditLoading(true);
    setError('');

    try {
      // Update product info
      await invoke('update_product', {
        id: editingProduct.id,
        productName: editName,
        categoryId: editCategory || null,
        unitId: editUnit || null,
        description: editDescription,
        status: editStatus,
      });

      // Update each variant
      for (const v of editVariants) {
        await invoke('update_product_variant', {
          id: v.id,
          variantName: v.variant_name,
          sku: v.sku,
          barcode: v.barcode,
          status: v.status,
        });
      }

      setShowEditModal(false);
      await loadData();
    } catch (e: any) {
      setError(e?.toString() || 'Terjadi kesalahan');
    } finally {
      setEditLoading(false);
    }
  };

  const updateEditVariant = (index: number, field: keyof ProductVariant, value: string) => {
    const updated = [...editVariants];
    updated[index] = { ...updated[index], [field]: value };
    setEditVariants(updated);
  };

  // ─── Delete Product ──────────────────────────────

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    try {
      await invoke('delete_product', { id: deleteTarget.id });
      setDeleteTarget(null);
      await loadData();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };



  // ─── Barcode button SVG icon ─────────────────────
  const BarcodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14" /><path d="M8 5v14" /><path d="M12 5v14" /><path d="M17 5v14" /><path d="M21 5v14" />
    </svg>
  );

  return (
    <div className="master-page">
      {/* Header */}
      <div className="master-page-header">
        <div className="master-page-header-info">
          <h2>Daftar Produk</h2>
          <p>Kelola produk dan variant untuk toko Anda</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Produk
        </button>
      </div>

      {/* Toolbar */}
      <div className="master-page-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-info">
          <span className="badge">{filtered.length} produk</span>
        </div>
      </div>

      {/* Table */}
      <div className="master-table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <div className="table-empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <p>Belum ada produk</p>
            <span>Klik "Tambah Produk" untuk menambahkan</span>
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th>Satuan</th>
                <th>Variant</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((product, idx) => (
                <tr key={product.id}>
                  <td className="td-number">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td>
                    <div className="td-name">
                      <span className="name-icon product-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </span>
                      <div>
                        <div>{product.product_name}</div>
                        {product.description && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {product.description.length > 50
                              ? product.description.substring(0, 50) + '...'
                              : product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="td-sku">{product.sku}</span>
                  </td>
                  <td className="td-date">{product.category_name || '-'}</td>
                  <td className="td-date">{product.unit_name || '-'}</td>
                  <td>
                    <span className="badge">
                      {product.variant_count || 0} variant
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${product.status}`}>
                      {product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon btn-edit" title="Edit" onClick={() => openEditModal(product)}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn-icon btn-delete" title="Hapus" onClick={() => setDeleteTarget(product)}>
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

      {/* ═══════════════════════════════════════════════
          ADD PRODUCT MODAL
          ═══════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Produk Baru</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Product Name */}
              <div className="form-group">
                <label>Nama Produk *</label>
                <input
                  type="text"
                  placeholder="Masukkan nama produk"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Category & Unit */}
              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Satuan</label>
                  <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
                    <option value="">Pilih Satuan</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_name} {u.unit_symbol ? `(${u.unit_symbol})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label>Deskripsi</label>
                <textarea
                  placeholder="Deskripsi produk (opsional)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* Barcode (shown only when variant is OFF) */}
              {!hasVariants && (
                <div className="form-group">
                  <label>Barcode</label>
                  <div className="input-with-btn">
                    <input
                      type="text"
                      placeholder="Masukkan atau generate barcode"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                    />
                    <button
                      className="btn-generate"
                      type="button"
                      onClick={handleGenerateMainBarcode}
                      title="Generate Barcode EAN-13"
                    >
                      <BarcodeIcon />
                      Generate
                    </button>
                  </div>
                </div>
              )}

              {/* Price & Cost (shown only when variant is OFF) */}
              {!hasVariants && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Harga Jual</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Harga Beli (Modal)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formCost}
                      onChange={(e) => setFormCost(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* SKU Toggle */}
              <div className="toggle-group">
                <div className="toggle-group-info">
                  <span>Buat SKU Sendiri</span>
                  <span>Jika tidak, sistem akan membuatkan SKU otomatis</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={useCustomSku}
                    onChange={(e) => setUseCustomSku(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {useCustomSku && (
                <div className="form-group">
                  <label>SKU</label>
                  <input
                    type="text"
                    placeholder="Masukkan SKU produk"
                    value={formCustomSku}
                    onChange={(e) => setFormCustomSku(e.target.value)}
                  />
                </div>
              )}

              {/* Variant Toggle */}
              <div className="toggle-group">
                <div className="toggle-group-info">
                  <span>Produk Punya Variant</span>
                  <span>Contoh: ukuran S, M, L atau warna Merah, Biru</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Variant Rows */}
              {hasVariants && (
                <div className="variant-section">
                  <div className="variant-section-header">
                    <h4>Daftar Variant</h4>
                    <button className="btn-add-variant" onClick={addVariantRow}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Tambah Variant
                    </button>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className="variant-card">
                      <div className="variant-card-header">
                        <span className="variant-card-title">Variant {i + 1}</span>
                        <button
                          className="btn-remove-variant"
                          title="Hapus variant"
                          onClick={() => removeVariant(i)}
                          disabled={variants.length <= 1}
                          style={{ opacity: variants.length <= 1 ? 0.3 : 1 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <div className="variant-card-body">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Nama Variant *</label>
                            <input
                              type="text"
                              placeholder="contoh: Merah, L"
                              value={v.variant_name}
                              onChange={(e) => updateVariant(i, 'variant_name', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>Barcode</label>
                            <div className="input-with-btn">
                              <input
                                type="text"
                                placeholder="Barcode variant"
                                value={v.barcode}
                                onChange={(e) => updateVariant(i, 'barcode', e.target.value)}
                              />
                              <button
                                className="btn-generate compact"
                                type="button"
                                onClick={() => handleGenerateVariantBarcode(i)}
                                title="Generate Barcode EAN-13"
                              >
                                <BarcodeIcon />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>Harga Jual</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={v.price || ''}
                              onChange={(e) => updateVariant(i, 'price', parseFloat(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Harga Beli (Modal)</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={v.cost || ''}
                              onChange={(e) => updateVariant(i, 'cost', parseFloat(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={handleAddProduct} disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          EDIT PRODUCT MODAL
          ═══════════════════════════════════════════════ */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Produk</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label>Nama Produk *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Kategori</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Satuan</label>
                  <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                    <option value="">Pilih Satuan</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_name} {u.unit_symbol ? `(${u.unit_symbol})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Deskripsi</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              {/* Variants Section */}
              {editVariants.length > 0 && (
                <div className="variant-section" style={{ marginTop: '8px' }}>
                  <div className="variant-section-header">
                    <h4>Variant Produk</h4>
                  </div>
                  {editVariants.map((v, i) => (
                    <div key={v.id} className="variant-card">
                      <div className="variant-card-header">
                        <span className="variant-card-title">
                          {v.variant_name === 'Default' ? 'Variant Default' : `Variant: ${v.variant_name}`}
                        </span>
                      </div>
                      <div className="variant-card-body">
                        <div className="form-row">
                          <div className="form-group">
                            <label>Nama Variant</label>
                            <input
                              type="text"
                              value={v.variant_name}
                              onChange={(e) => updateEditVariant(i, 'variant_name', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>SKU Variant</label>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => updateEditVariant(i, 'sku', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Barcode</label>
                          <div className="input-with-btn">
                            <input
                              type="text"
                              placeholder="Barcode variant"
                              value={v.barcode}
                              onChange={(e) => updateEditVariant(i, 'barcode', e.target.value)}
                            />
                            <button
                              className="btn-generate compact"
                              type="button"
                              onClick={() => handleGenerateEditVariantBarcode(i)}
                              title="Generate Barcode EAN-13"
                            >
                              <BarcodeIcon />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                Batal
              </button>
              <button className="btn-primary" onClick={handleEditProduct} disabled={editLoading}>
                {editLoading ? 'Menyimpan...' : 'Update Produk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Produk?"
          message={`Anda yakin ingin menghapus produk "${deleteTarget.product_name}" beserta semua variant-nya?`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={handleDeleteProduct}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default ProductPage;
