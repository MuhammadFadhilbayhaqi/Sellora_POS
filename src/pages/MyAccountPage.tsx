import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './MyAccountPage.css';

interface UserAccount {
  id: number;
  nama: string;
  username: string;
  email: string;
  phone: string;
}

function MyAccountPage() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Load account on mount
  useEffect(() => {
    invoke<UserAccount>('get_user_account')
      .then((a) => {
        setAccount(a);
        setTimeout(() => { isInitialLoad.current = false; }, 100);
      })
      .catch((e) => console.error('Failed to load account:', e));
  }, []);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!account || isInitialLoad.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(() => {
      invoke('update_user_account', {
        nama: account.nama,
        username: account.username,
        email: account.email,
        phone: account.phone,
        oldPassword: null,
        newPassword: null,
      })
        .then(() => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch((e) => {
          console.error('Failed to save account:', e);
          setSaveStatus('idle');
        });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [account]);

  const handleChange = (field: keyof UserAccount, value: string) => {
    setAccount((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Semua field password harus diisi');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok');
      return;
    }

    setChangingPassword(true);
    try {
      await invoke('update_user_account', {
        nama: account!.nama,
        username: account!.username,
        email: account!.email,
        phone: account!.phone,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
      setPasswordSuccess('Password berhasil diubah');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (e: any) {
      setPasswordError(typeof e === 'string' ? e : 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!account) {
    return (
      <div className="ma-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="ma-spinner" style={{ width: 32, height: 32 }}></div>
      </div>
    );
  }

  return (
    <div className="ma-page">
      {/* Page Header */}
      <div className="ma-header">
        <div className="ma-header-info">
          <h2>Akun Saya</h2>
          <p>Kelola informasi akun dan keamanan Anda</p>
        </div>
        <div className={`ma-save-indicator ${saveStatus}`}>
          {saveStatus === 'saving' && (
            <>
              <span className="ma-spinner"></span>
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

      {/* Content */}
      <div className="ma-content">
        {/* Account Avatar Card */}
        <div className="ma-avatar-card">
          <div className="ma-avatar">
            <span>{account.nama ? account.nama.charAt(0).toUpperCase() : 'U'}</span>
          </div>
          <h3 className="ma-avatar-name">{account.nama || 'Pengguna'}</h3>
          <p className="ma-avatar-username">@{account.username}</p>
          <div className="ma-avatar-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Akun Aktif</span>
          </div>
        </div>

        {/* Form Area */}
        <div className="ma-form-area">
          {/* Account Info Section */}
          <div className="ma-section">
            <div className="ma-section-header">
              <div className="ma-section-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3>Informasi Akun</h3>
                <p>Data pribadi yang digunakan dalam aplikasi</p>
              </div>
            </div>

            <div className="ma-fields-row">
              <div className="ma-field">
                <label htmlFor="accountNama">Nama Lengkap</label>
                <input
                  id="accountNama"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={account.nama}
                  onChange={(e) => handleChange('nama', e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="ma-field">
                <label htmlFor="accountUsername">Username</label>
                <input
                  id="accountUsername"
                  type="text"
                  placeholder="Masukkan username"
                  value={account.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>

            <div className="ma-fields-row">
              <div className="ma-field">
                <label htmlFor="accountEmail">Email</label>
                <input
                  id="accountEmail"
                  type="email"
                  placeholder="Contoh: email@domain.com"
                  value={account.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="ma-field">
                <label htmlFor="accountPhone">No. Telepon</label>
                <input
                  id="accountPhone"
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={account.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  maxLength={20}
                />
              </div>
            </div>
          </div>

          {/* Password Section */}
          <div className="ma-section">
            <div className="ma-section-header">
              <div className="ma-section-icon ma-section-icon-security">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3>Ubah Password</h3>
                <p>Perbarui password untuk keamanan akun Anda</p>
              </div>
            </div>

            <div className="ma-field">
              <label htmlFor="oldPassword">Password Lama</label>
              <div className="ma-password-input">
                <input
                  id="oldPassword"
                  type={showOldPassword ? 'text' : 'password'}
                  placeholder="Masukkan password lama"
                  value={oldPassword}
                  onChange={(e) => { setOldPassword(e.target.value); setPasswordError(''); }}
                />
                <button
                  type="button"
                  className="ma-password-toggle"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  tabIndex={-1}
                >
                  {showOldPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="ma-fields-row">
              <div className="ma-field">
                <label htmlFor="newPassword">Password Baru</label>
                <div className="ma-password-input">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  />
                  <button
                    type="button"
                    className="ma-password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="ma-field">
                <label htmlFor="confirmPassword">Konfirmasi Password</label>
                <div className="ma-password-input">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  />
                  <button
                    type="button"
                    className="ma-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {passwordError && (
              <div className="ma-password-message ma-password-error">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="ma-password-message ma-password-success">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {passwordSuccess}
              </div>
            )}

            <button
              className="ma-change-password-btn"
              onClick={handlePasswordChange}
              disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
            >
              {changingPassword ? (
                <>
                  <span className="ma-spinner" style={{ width: 16, height: 16 }}></span>
                  Mengubah...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Ubah Password
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyAccountPage;
