import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './BusinessProfilePage.css';

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_number: string;
  email: string;
  business_category: string;
  address: string;
  logo_base64: string;
  created_at: string;
  updated_at: string;
}

const BUSINESS_CATEGORIES = [
  'Makanan & Minuman',
  'Retail',
  'Jasa',
  'Fashion',
  'Elektronik',
  'Kesehatan',
  'Pendidikan',
  'Otomotif',
  'Lainnya',
];

function BusinessProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Load profile on mount
  useEffect(() => {
    invoke<BusinessProfile>('get_business_profile')
      .then((p) => {
        setProfile(p);
        // Mark initial load complete after state is set
        setTimeout(() => { isInitialLoad.current = false; }, 100);
      })
      .catch((e) => console.error('Failed to load business profile:', e));
  }, []);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!profile || isInitialLoad.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(() => {
      invoke('save_business_profile', { payload: profile })
        .then(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch((e) => {
          console.error('Failed to save business profile:', e);
          setSaveStatus('idle');
        });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [profile]);

  const handleChange = (field: keyof BusinessProfile, value: string) => {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      handleChange('logo_base64', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const removeLogo = () => {
    handleChange('logo_base64', '');
  };

  if (!profile) {
    return (
      <div className="business-profile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="bp-save-spinner" style={{ width: 32, height: 32 }}></div>
      </div>
    );
  }

  return (
    <div className="business-profile-page">
      {/* Page Header */}
      <div className="business-profile-header">
        <div className="business-profile-header-info">
          <h2>Profil Bisnis</h2>
          <p>Kelola informasi dan identitas bisnis Anda</p>
        </div>
        <div className={`bp-save-indicator ${saveStatus}`}>
          {saveStatus === 'saving' && (
            <>
              <span className="bp-save-spinner"></span>
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

      {/* Content Grid */}
      <div className="business-profile-content">
        {/* Left: Form */}
        <div className="bp-form-area">
          {/* Business Identity Section */}
          <div className="bp-section">
            <div className="bp-section-header">
              <div className="bp-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <h3>Identitas Bisnis</h3>
                <p>Informasi dasar tentang bisnis Anda</p>
              </div>
            </div>

            <div className="bp-field">
              <label htmlFor="businessName">Nama Bisnis</label>
              <input
                id="businessName"
                type="text"
                placeholder="Contoh: Toko Serba Ada"
                value={profile.business_name}
                onChange={(e) => handleChange('business_name', e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="bp-field">
              <label htmlFor="businessCategory">Kategori Bisnis</label>
              <select
                id="businessCategory"
                value={profile.business_category}
                onChange={(e) => handleChange('business_category', e.target.value)}
              >
                <option value="">Pilih Kategori</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bp-section">
            <div className="bp-section-header">
              <div className="bp-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <h3>Kontak Bisnis</h3>
                <p>Nomor telepon dan email untuk dihubungi</p>
              </div>
            </div>

            <div className="bp-fields-row">
              <div className="bp-field">
                <label htmlFor="contactNumber">Nomor Kontak</label>
                <input
                  id="contactNumber"
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={profile.contact_number}
                  onChange={(e) => handleChange('contact_number', e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="bp-field">
                <label htmlFor="businessEmail">Email Bisnis</label>
                <input
                  id="businessEmail"
                  type="email"
                  placeholder="Contoh: info@tokoku.com"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bp-section">
            <div className="bp-section-header">
              <div className="bp-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <h3>Alamat Bisnis</h3>
                <p>Lokasi fisik bisnis Anda</p>
              </div>
            </div>

            <div className="bp-field">
              <label htmlFor="businessAddress">Alamat Lengkap</label>
              <textarea
                id="businessAddress"
                placeholder="Contoh: Jl. Merdeka No. 123, Jakarta Selatan"
                value={profile.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={3}
                maxLength={300}
              />
            </div>
          </div>
        </div>

        {/* Right: Logo */}
        <div className="bp-logo-area">
          <div className="bp-logo-card">
            <h3>Logo Bisnis</h3>
            <p>Unggah logo bisnis Anda (maks 2MB)</p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />

            <div
              className={`bp-logo-upload-zone ${dragging ? 'dragging' : ''} ${profile.logo_base64 ? 'has-logo' : ''}`}
              onClick={() => !profile.logo_base64 && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {profile.logo_base64 ? (
                <img
                  src={profile.logo_base64}
                  alt="Logo Bisnis"
                  className="bp-logo-preview"
                />
              ) : (
                <>
                  <div className="bp-logo-upload-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div className="bp-logo-upload-text">
                    <span>Klik atau seret gambar</span>
                    <small>PNG, JPG, SVG (maks. 2MB)</small>
                  </div>
                </>
              )}
            </div>

            {profile.logo_base64 && (
              <div className="bp-logo-actions">
                <button className="bp-logo-change-btn" onClick={() => fileInputRef.current?.click()}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Ganti
                </button>
                <button className="bp-logo-remove-btn" onClick={removeLogo}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Hapus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessProfilePage;
