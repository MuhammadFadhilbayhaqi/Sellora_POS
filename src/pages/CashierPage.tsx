import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './CashierPage.css';
import './CategoryPage.css';

interface CashierPageProps {
  user: { id: number; nama: string; username: string };
}

interface InventoryItem {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  quantity: number;
  price: number;
  cost: number;
  category_id: string | null;
}

interface Category {
  id: string;
  category_name: string;
}

interface PaymentMethod {
  id: string;
  method_name: string;
  type: string;
  status: string;
}

interface Tax {
  id: string;
  tax_name: string;
  tax_rate: number;
  tax_type: string;
  status: string;
}

interface Transaction {
  id: string;
  invoice_number: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  status: string;
  created_at: string;
}

interface CartItem {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  stock: number;
}

function CashierPage({ user }: CashierPageProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activeTaxes, setActiveTaxes] = useState<Tax[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cashier_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [search, setSearch] = useState('');
  const [currentTxId, setCurrentTxId] = useState<string | null>(() => {
    return localStorage.getItem('cashier_tx_id') || null;
  });
  const [currentInvoice, setCurrentInvoice] = useState(() => {
    return localStorage.getItem('cashier_invoice') || '';
  });

  // modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHoldList, setShowHoldList] = useState(false);
  const [showHoldConfirm, setShowHoldConfirm] = useState(false);
  const [showHoldSuccess, setShowHoldSuccess] = useState(false);
  const [holdTransactions, setHoldTransactions] = useState<Transaction[]>([]);
  const [selectedPayMethod, setSelectedPayMethod] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payChange, setPayChange] = useState(0);

  // Persist cart state to localStorage
  useEffect(() => {
    localStorage.setItem('cashier_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (currentTxId) {
      localStorage.setItem('cashier_tx_id', currentTxId);
    } else {
      localStorage.removeItem('cashier_tx_id');
    }
  }, [currentTxId]);

  useEffect(() => {
    if (currentInvoice) {
      localStorage.setItem('cashier_invoice', currentInvoice);
    } else {
      localStorage.removeItem('cashier_invoice');
    }
  }, [currentInvoice]);

  const loadData = useCallback(async () => {
    try {
      const [inv, pms, txs, cats] = await Promise.all([
        invoke<InventoryItem[]>('get_inventory_list'),
        invoke<PaymentMethod[]>('get_payment_methods'),
        invoke<Tax[]>('get_taxes'),
        invoke<Category[]>('get_categories'),
      ]);
      setInventory(inv);
      setPaymentMethods(pms.filter(m => m.status === 'active'));
      setActiveTaxes(txs.filter(t => t.status === 'active'));
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load cashier data:', e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  // Filter products
  const filteredProducts = inventory.filter(i => {
    const matchesSearch = i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.variant_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || i.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart calculations
  const subtotal = cart.reduce((sum, c) => sum + (c.price * c.quantity - c.discount), 0);
  const taxTotal = activeTaxes.reduce((sum, t) => {
    if (t.tax_type === 'PERCENTAGE') return sum + (subtotal * t.tax_rate / 100);
    return sum + t.tax_rate;
  }, 0);
  const grandTotal = subtotal + taxTotal;

  // Add to cart
  const addToCart = (item: InventoryItem) => {
    const existing = cart.find(c => c.variant_id === item.variant_id);
    if (existing) {
      setCart(cart.map(c =>
        c.variant_id === item.variant_id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        variant_id: item.variant_id,
        product_name: item.product_name,
        variant_name: item.variant_name,
        sku: item.sku,
        price: item.price,
        quantity: 1,
        discount: 0,
        stock: item.quantity,
      }]);
    }
  };

  const updateQty = (variantId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.variant_id !== variantId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (variantId: string) => {
    setCart(cart.filter(c => c.variant_id !== variantId));
  };

  const clearCart = () => {
    setCart([]);
    setCurrentTxId(null);
    setCurrentInvoice('');
    localStorage.removeItem('cashier_cart');
    localStorage.removeItem('cashier_tx_id');
    localStorage.removeItem('cashier_invoice');
  };

  // ─── Create Transaction → OPEN ───
  const createAndProcess = async (action: 'hold' | 'pay') => {
    if (cart.length === 0) return;
    try {
      const items = cart.map(c => ({
        variant_id: c.variant_id,
        quantity: c.quantity,
        price: c.price,
        discount: c.discount,
      }));

      let txId = currentTxId;

      if (!txId) {
        // Create new transaction (OPEN)
        const tx = await invoke<Transaction>('create_transaction', {
          cashierId: user.id,
          items,
        });
        txId = tx.id;
        setCurrentTxId(tx.id);
        setCurrentInvoice(tx.invoice_number);
      } else {
        // Update existing transaction items to match current cart
        await invoke('update_transaction_items', {
          transactionId: txId,
          items,
        });
      }

      if (action === 'hold') {
        await invoke('hold_transaction', { transactionId: txId });
        clearCart();
        setShowHoldSuccess(true);
        setTimeout(() => setShowHoldSuccess(false), 3000);
        await loadData();
      } else {
        // open pay modal
        setShowPayModal(true);
      }
    } catch (e) {
      console.error('Transaction error:', e);
    }
  };

  // ─── Pay ───
  const handlePay = async () => {
    if (!selectedPayMethod || !currentTxId) return;
    const amt = parseFloat(payAmount) || grandTotal;

    if (amt < grandTotal) return;

    setPayLoading(true);
    try {
      await invoke('pay_transaction', {
        transactionId: currentTxId,
        paymentMethodId: selectedPayMethod,
        amount: amt,
        referenceNumber: payRef,
      });
      setPayChange(amt - grandTotal);
      setPaySuccess(true);
    } catch (e) {
      console.error('Payment failed:', e);
    } finally {
      setPayLoading(false);
    }
  };

  const closePaySuccess = async () => {
    setShowPayModal(false);
    setPaySuccess(false);
    setSelectedPayMethod('');
    setPayAmount('');
    setPayRef('');
    setPayChange(0);
    clearCart();
    await loadData();
  };

  // ─── Hold List ───
  const openHoldList = async () => {
    try {
      const list = await invoke<Transaction[]>('get_hold_transactions');
      setHoldTransactions(list);
      setShowHoldList(true);
    } catch (e) {
      console.error(e);
    }
  };

  const resumeTransaction = async (tx: Transaction) => {
    try {
      const items = await invoke<any[]>('get_transaction_items', { transactionId: tx.id });
      const cartItems: CartItem[] = items.map((i: any) => ({
        variant_id: i.variant_id,
        product_name: i.product_name || '',
        variant_name: i.variant_name || '',
        sku: i.sku || '',
        price: i.price,
        quantity: i.quantity,
        discount: i.discount,
        stock: 999,
      }));
      setCart(cartItems);
      setCurrentTxId(tx.id);
      setCurrentInvoice(tx.invoice_number);
      setShowHoldList(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Open pay modal (creating tx first if needed)
  const openPayModal = async () => {
    if (cart.length === 0) return;
    if (!currentTxId) {
      await createAndProcess('pay');
    } else {
      // Update existing transaction items to match current cart before paying
      try {
        const items = cart.map(c => ({
          variant_id: c.variant_id,
          quantity: c.quantity,
          price: c.price,
          discount: c.discount,
        }));
        await invoke('update_transaction_items', {
          transactionId: currentTxId,
          items,
        });
      } catch (e) {
        console.error('Failed to update transaction items:', e);
      }
      setShowPayModal(true);
    }
  };

  return (
    <div className="cashier-container">
      {/* ═══ Left: Product List ═══ */}
      <div className="cashier-products">
        <div className="cashier-products-header">
          <div className="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Cari produk (nama, SKU)..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="cashier-hold-btn" onClick={openHoldList}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="2" y="2" width="20" height="20" rx="2" /><line x1="8" y1="6" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="18" />
            </svg>
            Hold
          </button>
        </div>
        <div className="category-filter">
          <button
            className={`category-pill ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {filteredProducts.length === 0 ? (
            <div className="product-grid-empty">
              <p>Tidak ada produk ditemukan</p>
            </div>
          ) : (
            filteredProducts.map((item) => (
              <div className="product-card" key={item.variant_id} onClick={() => addToCart(item)}>
                <div className="product-card-name">
                  {item.product_name}
                  {item.variant_name !== 'Default' && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> — {item.variant_name}</span>}
                </div>
                <div className="product-card-sku">{item.sku}</div>
                <div className="product-card-price">{formatCurrency(item.price)}</div>
                <div className="product-card-stock">Stok: {item.quantity}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ Right: Cart ═══ */}
      <div className="cashier-cart">
        <div className="cashier-cart-header">
          <h3>🛒 Keranjang</h3>
          {currentInvoice && <span className="invoice-badge">{currentInvoice}</span>}
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p>Keranjang kosong</p>
            <p style={{ fontSize: '12px' }}>Klik produk di sebelah kiri untuk menambahkan</p>
          </div>
        ) : (
          <div className="cart-items">
            {cart.map((item) => (
              <div className="cart-item" key={item.variant_id}>
                <div className="cart-item-info">
                  <div className="cart-item-name">
                    {item.product_name}
                    {item.variant_name !== 'Default' && ` - ${item.variant_name}`}
                  </div>
                  <div className="cart-item-price">{formatCurrency(item.price)}</div>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQty(item.variant_id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item.variant_id, 1)}>+</button>
                </div>
                <div className="cart-item-subtotal">{formatCurrency(item.price * item.quantity)}</div>
                <button className="cart-item-remove" onClick={() => removeFromCart(item.variant_id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <>
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {activeTaxes.map(t => (
                <div className="cart-summary-row" key={t.id}>
                  <span>{t.tax_name} ({t.tax_type === 'PERCENTAGE' ? `${t.tax_rate}%` : 'Fixed'})</span>
                  <span>{formatCurrency(t.tax_type === 'PERCENTAGE' ? subtotal * t.tax_rate / 100 : t.tax_rate)}</span>
                </div>
              ))}
              <div className="cart-summary-total">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div className="cart-actions">
              <button className="btn-hold" onClick={() => setShowHoldConfirm(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                  <rect x="2" y="2" width="20" height="20" rx="2" /><line x1="8" y1="6" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="18" />
                </svg>
                Hold
              </button>
              <button className="btn-pay" onClick={openPayModal}>
                Bayar {formatCurrency(grandTotal)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ═══ Payment Modal ═══ */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => { if (!paySuccess) setShowPayModal(false); }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            {!paySuccess ? (
              <>
                <div className="modal-header">
                  <h3>Pembayaran</h3>
                  <button className="modal-close" onClick={() => setShowPayModal(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                <div className="modal-body">
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Tagihan</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(grandTotal)}</div>
                  </div>

                  <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', display: 'block' }}>Pilih Metode Pembayaran</label>
                  <div className="payment-methods-grid">
                    {paymentMethods.map(pm => (
                      <div key={pm.id} className={`payment-method-card ${selectedPayMethod === pm.id ? 'selected' : ''}`} onClick={() => setSelectedPayMethod(pm.id)}>
                        <div className="pm-name">{pm.method_name}</div>
                        <div className="pm-type">{pm.type}</div>
                      </div>
                    ))}
                  </div>
                  {paymentMethods.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Belum ada metode pembayaran aktif. Tambahkan di menu Transaksi → Metode Pembayaran.
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label>Jumlah Dibayar</label>
                    <div className="pay-amount-row">
                      <input type="number" placeholder={grandTotal.toString()} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min={grandTotal} />
                      <button type="button" className="btn-exact-amount" onClick={() => setPayAmount(grandTotal.toString())}>
                        Uang Pas
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>No. Referensi (opsional)</label>
                    <input type="text" placeholder="Mis. No. kartu, ID GoPay" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>

                  {payAmount && parseFloat(payAmount) >= grandTotal && (
                    <div className="payment-change">
                      <div className="change-label">Kembalian</div>
                      <div className="change-amount">{formatCurrency(parseFloat(payAmount) - grandTotal)}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn-secondary" onClick={() => setShowPayModal(false)}>Batal</button>
                  <button className="btn-primary" onClick={handlePay} disabled={payLoading || !selectedPayMethod || (!!payAmount && parseFloat(payAmount) < grandTotal)}>
                    {payLoading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-body" style={{ textAlign: 'center', padding: '40px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" width="64" height="64" style={{ marginBottom: '16px' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h3 style={{ margin: '0 0 8px', color: 'var(--success)' }}>Pembayaran Berhasil!</h3>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 4px', fontSize: '13px' }}>{currentInvoice}</p>
                  <p style={{ fontSize: '22px', fontWeight: 800, margin: '0' }}>{formatCurrency(grandTotal)}</p>
                  {payChange > 0 && (
                    <div className="payment-change" style={{ marginTop: '16px' }}>
                      <div className="change-label">Kembalian</div>
                      <div className="change-amount">{formatCurrency(payChange)}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                  <button className="btn-primary" onClick={closePaySuccess} style={{ minWidth: '200px' }}>Transaksi Baru</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Hold List Modal ═══ */}
      {showHoldList && (
        <div className="modal-overlay" onClick={() => setShowHoldList(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaksi Ditahan</h3>
              <button className="modal-close" onClick={() => setShowHoldList(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {holdTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  <p>Tidak ada transaksi yang ditahan</p>
                </div>
              ) : (
                holdTransactions.map(tx => (
                  <div className="hold-list-item" key={tx.id} onClick={() => resumeTransaction(tx)}>
                    <div className="hold-info">
                      <div className="hold-invoice">{tx.invoice_number}</div>
                      <div className="hold-date">{tx.created_at}</div>
                    </div>
                    <div className="hold-total">{formatCurrency(tx.grand_total)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Hold Confirmation Dialog ═══ */}
      {showHoldConfirm && (
        <div className="modal-overlay" onClick={() => setShowHoldConfirm(false)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width="48" height="48" style={{ marginBottom: '16px' }}>
                <rect x="2" y="2" width="20" height="20" rx="2" /><line x1="8" y1="6" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="18" />
              </svg>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>Tahan Transaksi?</h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Transaksi ini akan ditahan dan bisa dilanjutkan nanti. Yakin ingin menahan transaksi ini?
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setShowHoldConfirm(false)} style={{ minWidth: '100px' }}>Batal</button>
                <button className="btn-hold-confirm" onClick={() => { setShowHoldConfirm(false); createAndProcess('hold'); }} style={{ minWidth: '100px' }}>
                  Ya, Tahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Hold Success Toast ═══ */}
      {showHoldSuccess && (
        <div className="toast-notification toast-success">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>Transaksi berhasil ditahan!</span>
        </div>
      )}
    </div>
  );
}

export default CashierPage;
