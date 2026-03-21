import { useState } from 'react';
import './DeviceSettingsPage.css';

type ConnectionType = 'usb' | 'lan' | 'bluetooth';

interface ConnectionConfig {
  type: ConnectionType;
  // USB
  usbPort: string;
  // LAN
  ipAddress: string;
  port: string;
  // Bluetooth
  deviceName: string;
}

function DeviceSettingsPage() {
  const [activeConnection, setActiveConnection] = useState<ConnectionType | null>(null);
  const [config, setConfig] = useState<ConnectionConfig>({
    type: 'usb',
    usbPort: '',
    ipAddress: '',
    port: '9100',
    deviceName: '',
  });
  const [connectionStatus, setConnectionStatus] = useState<Record<ConnectionType, 'disconnected' | 'connected' | 'connecting'>>({
    usb: 'disconnected',
    lan: 'disconnected',
    bluetooth: 'disconnected',
  });
  const [testPrintStatus, setTestPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');

  const connectionTypes = [
    {
      id: 'usb' as ConnectionType,
      title: 'USB',
      description: 'Hubungkan printer thermal melalui kabel USB',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v6" />
          <circle cx="12" cy="10" r="2" />
          <path d="M12 12v4" />
          <path d="M7 16H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h2" />
          <path d="M17 16h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2" />
          <rect x="7" y="14" width="10" height="4" rx="1" />
        </svg>
      ),
    },
    {
      id: 'lan' as ConnectionType,
      title: 'LAN / WiFi',
      description: 'Hubungkan printer melalui jaringan lokal atau WiFi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" />
        </svg>
      ),
    },
    {
      id: 'bluetooth' as ConnectionType,
      title: 'Bluetooth',
      description: 'Hubungkan printer thermal via Bluetooth',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
        </svg>
      ),
    },
  ];

  const handleConnect = (type: ConnectionType) => {
    setConnectionStatus((prev) => ({ ...prev, [type]: 'connecting' }));

    // Simulate connection
    setTimeout(() => {
      setConnectionStatus((prev) => ({ ...prev, [type]: 'connected' }));
    }, 2000);
  };

  const handleDisconnect = (type: ConnectionType) => {
    setConnectionStatus((prev) => ({ ...prev, [type]: 'disconnected' }));
  };

  const handleTestPrint = () => {
    setTestPrintStatus('printing');

    // Simulate test print
    setTimeout(() => {
      const anyConnected = Object.values(connectionStatus).some((s) => s === 'connected');
      if (anyConnected) {
        setTestPrintStatus('success');
      } else {
        setTestPrintStatus('error');
      }

      // Reset after 3s
      setTimeout(() => setTestPrintStatus('idle'), 3000);
    }, 2000);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Terhubung';
      case 'connecting':
        return 'Menghubungkan...';
      default:
        return 'Tidak Terhubung';
    }
  };

  const renderConfigPanel = (type: ConnectionType) => {
    switch (type) {
      case 'usb':
        return (
          <div className="config-panel">
            <div className="config-field">
              <label>Port USB</label>
              <div className="config-input-group">
                <input
                  type="text"
                  placeholder="Contoh: COM3 atau /dev/usb/lp0"
                  value={config.usbPort}
                  onChange={(e) => setConfig({ ...config, usbPort: e.target.value })}
                />
                <button className="btn-detect" onClick={() => setConfig({ ...config, usbPort: 'COM3' })}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Auto Deteksi
                </button>
              </div>
            </div>
          </div>
        );
      case 'lan':
        return (
          <div className="config-panel">
            <div className="config-fields-row">
              <div className="config-field">
                <label>Alamat IP</label>
                <input
                  type="text"
                  placeholder="Contoh: 192.168.1.100"
                  value={config.ipAddress}
                  onChange={(e) => setConfig({ ...config, ipAddress: e.target.value })}
                />
              </div>
              <div className="config-field config-field-small">
                <label>Port</label>
                <input
                  type="text"
                  placeholder="9100"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
      case 'bluetooth':
        return (
          <div className="config-panel">
            <div className="config-field">
              <label>Nama Perangkat</label>
              <div className="config-input-group">
                <input
                  type="text"
                  placeholder="Nama printer Bluetooth"
                  value={config.deviceName}
                  onChange={(e) => setConfig({ ...config, deviceName: e.target.value })}
                />
                <button className="btn-detect" onClick={() => setConfig({ ...config, deviceName: 'Thermal Printer BT' })}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <circle cx="12" cy="20" r="1" />
                  </svg>
                  Scan Perangkat
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  const anyConnected = Object.values(connectionStatus).some((s) => s === 'connected');

  return (
    <div className="device-settings-page">
      {/* Page Header */}
      <div className="device-settings-header">
        <div className="device-settings-header-info">
          <h2>Pengaturan Perangkat</h2>
          <p>Hubungkan dan kelola printer thermal untuk mencetak struk</p>
        </div>
      </div>

      {/* Connection Cards */}
      <div className="connection-cards">
        {connectionTypes.map((conn) => {
          const status = connectionStatus[conn.id];
          const isExpanded = activeConnection === conn.id;

          return (
            <div
              key={conn.id}
              className={`connection-card ${isExpanded ? 'expanded' : ''} ${status === 'connected' ? 'connected' : ''}`}
            >
              <div
                className="connection-card-header"
                onClick={() => setActiveConnection(isExpanded ? null : conn.id)}
              >
                <div className="connection-card-left">
                  <div className={`connection-icon ${status}`}>
                    {conn.icon}
                  </div>
                  <div className="connection-info">
                    <h3>{conn.title}</h3>
                    <p>{conn.description}</p>
                  </div>
                </div>
                <div className="connection-card-right">
                  <div className={`connection-status-badge ${status}`}>
                    <span className="status-dot"></span>
                    {getStatusLabel(status)}
                  </div>
                  <span className={`connection-chevron ${isExpanded ? 'expanded' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="connection-card-body">
                  {renderConfigPanel(conn.id)}

                  <div className="connection-actions">
                    {status === 'connected' ? (
                      <button
                        className="btn-disconnect"
                        onClick={() => handleDisconnect(conn.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Putuskan Koneksi
                      </button>
                    ) : (
                      <button
                        className="btn-connect"
                        onClick={() => handleConnect(conn.id)}
                        disabled={status === 'connecting'}
                      >
                        {status === 'connecting' ? (
                          <>
                            <span className="btn-spinner"></span>
                            Menghubungkan...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14" />
                              <path d="M12 5l7 7-7 7" />
                            </svg>
                            Hubungkan
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Print Section */}
      <div className="test-print-section">
        <div className="test-print-card">
          <div className="test-print-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </div>
          <div className="test-print-info">
            <h3>Test Cetak</h3>
            <p>Kirim halaman test ke printer thermal untuk memastikan koneksi berfungsi dengan baik</p>
          </div>
          <button
            className={`btn-test-print ${testPrintStatus}`}
            onClick={handleTestPrint}
            disabled={testPrintStatus === 'printing'}
          >
            {testPrintStatus === 'printing' && (
              <>
                <span className="btn-spinner"></span>
                Mencetak...
              </>
            )}
            {testPrintStatus === 'success' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Berhasil!
              </>
            )}
            {testPrintStatus === 'error' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Gagal — Periksa koneksi
              </>
            )}
            {testPrintStatus === 'idle' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Test Cetak
              </>
            )}
          </button>
        </div>

        {!anyConnected && testPrintStatus === 'idle' && (
          <div className="test-print-hint">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Hubungkan printer terlebih dahulu sebelum melakukan test cetak
          </div>
        )}
      </div>
    </div>
  );
}

export default DeviceSettingsPage;
