import './DeviceSettingsPage.css';

function ReceiptSettingsPage() {
  return (
    <div className="device-settings-page">
      {/* Page Header */}
      <div className="device-settings-header">
        <div className="device-settings-header-info">
          <h2>Pengaturan Struk</h2>
          <p>Atur template, informasi toko, dan format struk</p>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="receipt-coming-soon">
        <div className="coming-soon-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
        </div>
        <h3>Segera Hadir</h3>
        <p>Fitur pengaturan struk sedang dalam pengembangan. Anda akan dapat mengatur template struk, informasi toko, logo, dan format cetak.</p>
      </div>
    </div>
  );
}

export default ReceiptSettingsPage;
