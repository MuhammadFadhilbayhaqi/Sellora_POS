import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './ReceiptSettingsPage.css';

interface ReceiptSettings {
  headerNote: string;
  footerNote: string;
  showTax: boolean;
  showBusinessName: boolean;
  showBusinessContact: boolean;
  showBusinessEmail: boolean;
  showBusinessCategory: boolean;
  showBusinessAddress: boolean;
  showBusinessLogo: boolean;
}

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_number: string;
  email: string;
  business_category: string;
  address: string;
  logo_base64: string;
}

const DEFAULT_SETTINGS: ReceiptSettings = {
  headerNote: '',
  footerNote: 'Terima kasih atas kunjungan Anda!',
  showTax: true,
  showBusinessName: true,
  showBusinessContact: false,
  showBusinessEmail: false,
  showBusinessCategory: false,
  showBusinessAddress: false,
  showBusinessLogo: false,
};

const PROFILE_TOGGLES: { key: keyof ReceiptSettings; label: string; desc: string }[] = [
  { key: 'showBusinessName', label: 'Nama Bisnis', desc: 'Tampilkan nama bisnis di header struk' },
  { key: 'showBusinessLogo', label: 'Logo Bisnis', desc: 'Tampilkan logo bisnis di atas nama toko' },
  { key: 'showBusinessContact', label: 'Nomor Kontak', desc: 'Tampilkan nomor telepon bisnis di struk' },
  { key: 'showBusinessEmail', label: 'Email Bisnis', desc: 'Tampilkan alamat email bisnis di struk' },
  { key: 'showBusinessCategory', label: 'Kategori Bisnis', desc: 'Tampilkan kategori/jenis bisnis di struk' },
  { key: 'showBusinessAddress', label: 'Alamat Bisnis', desc: 'Tampilkan alamat lengkap bisnis di struk' },
];

function ReceiptSettingsPage() {
  const [settings, setSettings] = useState<ReceiptSettings>(() => {
    const saved = localStorage.getItem('receipt_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  // Load business profile for preview
  useEffect(() => {
    invoke<BusinessProfile>('get_business_profile')
      .then(setProfile)
      .catch(() => {});
  }, []);

  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('receipt_settings', JSON.stringify(settings));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
    return () => clearTimeout(timer);
  }, [settings]);

  const handleChange = (field: keyof ReceiptSettings, value: string | boolean) => {
    setSaveStatus('saving');
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  // Preview data
  const now = new Date();
  const formattedDate = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if any business profile toggle is on
  const hasAnyProfileToggle = settings.showBusinessName || settings.showBusinessContact ||
    settings.showBusinessEmail || settings.showBusinessCategory ||
    settings.showBusinessAddress || settings.showBusinessLogo;

  return (
    <div className="receipt-settings-page">
      {/* Page Header */}
      <div className="receipt-settings-header">
        <div className="receipt-settings-header-info">
          <h2>Pengaturan Struk</h2>
          <p>Atur header, footer, dan format tampilan struk</p>
        </div>
        <div className={`save-indicator ${saveStatus}`}>
          {saveStatus === 'saving' && (
            <>
              <span className="save-spinner"></span>
              Menyimpan...
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Tersimpan
            </>
          )}
        </div>
      </div>

      {/* Split Layout */}
      <div className="receipt-settings-content">
        {/* Left: Settings Form */}
        <div className="receipt-settings-form">
          {/* Header Note */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 11 12 6 7 11" />
                  <polyline points="17 18 12 13 7 18" />
                </svg>
              </div>
              <div>
                <h3>Header Struk</h3>
                <p>Teks yang ditampilkan di bagian atas struk</p>
              </div>
            </div>
            <div className="settings-field">
              <label htmlFor="headerNote">Catatan Header</label>
              <textarea
                id="headerNote"
                placeholder="Contoh: Selamat datang di Toko Kami!"
                value={settings.headerNote}
                onChange={(e) => handleChange('headerNote', e.target.value)}
                rows={3}
                maxLength={200}
              />
              <span className="char-count">{settings.headerNote.length}/200</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
              </div>
              <div>
                <h3>Footer Struk</h3>
                <p>Teks yang ditampilkan di bagian bawah struk</p>
              </div>
            </div>
            <div className="settings-field">
              <label htmlFor="footerNote">Catatan Footer</label>
              <textarea
                id="footerNote"
                placeholder="Contoh: Terima kasih telah berbelanja!"
                value={settings.footerNote}
                onChange={(e) => handleChange('footerNote', e.target.value)}
                rows={3}
                maxLength={200}
              />
              <span className="char-count">{settings.footerNote.length}/200</span>
            </div>
          </div>

          {/* Tax Display Toggle */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <h3>Tampilan Pajak</h3>
                <p>Tampilkan detail pajak pada struk</p>
              </div>
            </div>
            <div className="settings-toggle-row">
              <div className="toggle-info">
                <span className="toggle-label">Tampilkan Pajak di Struk</span>
                <span className="toggle-desc">Jika dinonaktifkan, baris pajak tidak akan dicetak pada struk</span>
              </div>
              <button
                className={`toggle-switch ${settings.showTax ? 'active' : ''}`}
                onClick={() => handleChange('showTax', !settings.showTax)}
                role="switch"
                aria-checked={settings.showTax}
              >
                <span className="toggle-knob"></span>
              </button>
            </div>
          </div>

          {/* Business Profile Display Toggles */}
          <div className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <h3>Profil Bisnis di Struk</h3>
                <p>Pilih informasi bisnis yang ditampilkan pada struk</p>
              </div>
            </div>
            {(!profile || (!profile.business_name && !profile.contact_number && !profile.email && !profile.address)) && (
              <div className="settings-profile-hint">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Lengkapi data di menu <strong>Profil Bisnis</strong> agar bisa ditampilkan di struk</span>
              </div>
            )}
            <div className="settings-toggle-list">
              {PROFILE_TOGGLES.map((toggle) => (
                <div className="settings-toggle-row" key={toggle.key}>
                  <div className="toggle-info">
                    <span className="toggle-label">{toggle.label}</span>
                    <span className="toggle-desc">{toggle.desc}</span>
                  </div>
                  <button
                    className={`toggle-switch ${settings[toggle.key] ? 'active' : ''}`}
                    onClick={() => handleChange(toggle.key, !settings[toggle.key])}
                    role="switch"
                    aria-checked={!!settings[toggle.key]}
                  >
                    <span className="toggle-knob"></span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Receipt Preview */}
        <div className="receipt-preview-container">
          <div className="preview-header-bar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preview Struk</span>
          </div>

          <div className="receipt-preview-wrapper">
            <div className="receipt-paper">
              {/* Zigzag top */}
              <div className="receipt-zigzag top"></div>

              <div className="receipt-body">
                {/* Business Logo */}
                {settings.showBusinessLogo && profile?.logo_base64 && (
                  <div className="receipt-logo">
                    <img src={profile.logo_base64} alt="Logo" />
                  </div>
                )}

                {/* Store Name - use business name if toggled on and available */}
                <div className="receipt-store-name">
                  {settings.showBusinessName && profile?.business_name
                    ? profile.business_name.toUpperCase()
                    : 'SELLORA POS'}
                </div>

                {/* Business Profile Info (below store name) */}
                {hasAnyProfileToggle && profile && (
                  <div className="receipt-business-info">
                    {settings.showBusinessCategory && profile.business_category && (
                      <div className="receipt-business-line">{profile.business_category}</div>
                    )}
                    {settings.showBusinessAddress && profile.address && (
                      <div className="receipt-business-line">{profile.address}</div>
                    )}
                    {settings.showBusinessContact && profile.contact_number && (
                      <div className="receipt-business-line">Tel: {profile.contact_number}</div>
                    )}
                    {settings.showBusinessEmail && profile.email && (
                      <div className="receipt-business-line">{profile.email}</div>
                    )}
                  </div>
                )}

                {/* Header Note */}
                {settings.headerNote && (
                  <div className="receipt-header-note">{settings.headerNote}</div>
                )}

                <div className="receipt-divider"></div>

                {/* Transaction Info */}
                <div className="receipt-info-row">
                  <span>No. Invoice</span>
                  <span>INV-2026001</span>
                </div>
                <div className="receipt-info-row">
                  <span>Tanggal</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="receipt-info-row">
                  <span>Waktu</span>
                  <span>{formattedTime}</span>
                </div>
                <div className="receipt-info-row">
                  <span>Kasir</span>
                  <span>Admin</span>
                </div>

                <div className="receipt-divider"></div>

                {/* Items */}
                <div className="receipt-item">
                  <div className="receipt-item-name">Kopi Susu Gula Aren</div>
                  <div className="receipt-item-detail">
                    <span>2 x Rp 25.000</span>
                    <span>Rp 50.000</span>
                  </div>
                </div>
                <div className="receipt-item">
                  <div className="receipt-item-name">Roti Bakar Coklat</div>
                  <div className="receipt-item-detail">
                    <span>1 x Rp 15.000</span>
                    <span>Rp 15.000</span>
                  </div>
                </div>

                <div className="receipt-divider"></div>

                {/* Totals */}
                <div className="receipt-info-row">
                  <span>Subtotal</span>
                  <span>Rp 65.000</span>
                </div>

                {settings.showTax && (
                  <div className="receipt-info-row receipt-tax-row">
                    <span>Pajak (11%)</span>
                    <span>Rp 7.150</span>
                  </div>
                )}

                <div className="receipt-divider bold"></div>

                <div className="receipt-info-row receipt-total">
                  <span>TOTAL</span>
                  <span>Rp {settings.showTax ? '72.150' : '65.000'}</span>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-info-row">
                  <span>Tunai</span>
                  <span>Rp 100.000</span>
                </div>
                <div className="receipt-info-row">
                  <span>Kembali</span>
                  <span>Rp {settings.showTax ? '27.850' : '35.000'}</span>
                </div>

                <div className="receipt-divider"></div>

                {/* Footer Note */}
                {settings.footerNote && (
                  <div className="receipt-footer-note">{settings.footerNote}</div>
                )}
              </div>

              {/* Zigzag bottom */}
              <div className="receipt-zigzag bottom"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptSettingsPage;
