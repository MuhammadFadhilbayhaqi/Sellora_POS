import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './DeviceSettingsPage.css';

type ConnectionType = 'usb' | 'lan' | 'bluetooth';

interface DetectedDevice {
  id: string;
  name: string;
  address: string;
  type: ConnectionType;
}

function DeviceSettingsPage() {
  const [activeConnection, setActiveConnection] = useState<ConnectionType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<ConnectionType, 'disconnected' | 'connected' | 'connecting'>>({
    usb: 'disconnected',
    lan: 'disconnected',
    bluetooth: 'disconnected',
  });

  // Device detection state
  const [detectedDevices, setDetectedDevices] = useState<Record<ConnectionType, DetectedDevice[]>>({
    usb: [],
    lan: [],
    bluetooth: [],
  });
  const [scanningType, setScanningType] = useState<ConnectionType | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Record<ConnectionType, string | null>>({
    usb: null,
    lan: null,
    bluetooth: null,
  });
  const [hasScanned, setHasScanned] = useState<Record<ConnectionType, boolean>>({
    usb: false,
    lan: false,
    bluetooth: false,
  });

  const [testPrintStatus, setTestPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // LAN manual IP input
  const [lanIpAddress, setLanIpAddress] = useState('');
  const [lanPort, setLanPort] = useState('9100');

  const connectionTypes = [
    {
      id: 'usb' as ConnectionType,
      title: 'USB',
      description: 'Deteksi printer thermal yang terhubung melalui kabel USB',
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
      description: 'Hubungkan ke printer di jaringan lokal melalui IP address',
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
      description: 'Deteksi printer Bluetooth yang tersedia di sekitar',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
        </svg>
      ),
    },
  ];

  const handleDetectDevices = async (type: ConnectionType) => {
    setScanningType(type);
    setSelectedDevice((prev) => ({ ...prev, [type]: null }));
    setErrorMessage(null);

    try {
      let devices: DetectedDevice[] = [];

      switch (type) {
        case 'usb':
          devices = await invoke<DetectedDevice[]>('list_serial_ports');
          break;
        case 'lan': {
          const ip = lanIpAddress.trim();
          if (!ip) {
            setErrorMessage('Masukkan IP address printer terlebih dahulu.');
            setScanningType(null);
            return;
          }
          const port = parseInt(lanPort) || 9100;
          devices = await invoke<DetectedDevice[]>('scan_lan_devices', { ip, port });
          break;
        }
        case 'bluetooth':
          devices = await invoke<DetectedDevice[]>('scan_bluetooth_devices');
          break;
      }

      setDetectedDevices((prev) => ({ ...prev, [type]: devices }));
      setHasScanned((prev) => ({ ...prev, [type]: true }));
    } catch (err) {
      const message = typeof err === 'string' ? err : (err as Error)?.message || 'Terjadi kesalahan saat mendeteksi perangkat.';
      setErrorMessage(message);
      setDetectedDevices((prev) => ({ ...prev, [type]: [] }));
      setHasScanned((prev) => ({ ...prev, [type]: true }));
    } finally {
      setScanningType(null);
    }
  };

  const handleConnect = async (type: ConnectionType) => {
    const deviceId = selectedDevice[type];
    if (!deviceId) return;

    const device = detectedDevices[type].find((d) => d.id === deviceId);
    if (!device) return;

    setConnectionStatus((prev) => ({ ...prev, [type]: 'connecting' }));
    setErrorMessage(null);

    try {
      await invoke('connect_device', {
        config: {
          connection_type: type,
          address: device.address,
        },
      });
      setConnectionStatus((prev) => ({ ...prev, [type]: 'connected' }));
    } catch (err) {
      const message = typeof err === 'string' ? err : (err as Error)?.message || 'Gagal menghubungkan ke perangkat.';
      setErrorMessage(message);
      setConnectionStatus((prev) => ({ ...prev, [type]: 'disconnected' }));
    }
  };

  const handleDisconnect = async (type: ConnectionType) => {
    setErrorMessage(null);
    try {
      await invoke('disconnect_device');
      setConnectionStatus((prev) => ({ ...prev, [type]: 'disconnected' }));
    } catch (err) {
      const message = typeof err === 'string' ? err : (err as Error)?.message || 'Gagal memutuskan koneksi.';
      setErrorMessage(message);
    }
  };

  const handleTestPrint = async () => {
    setTestPrintStatus('printing');
    setErrorMessage(null);

    try {
      await invoke('test_print_device');
      setTestPrintStatus('success');
      setTimeout(() => setTestPrintStatus('idle'), 3000);
    } catch (err) {
      const message = typeof err === 'string' ? err : (err as Error)?.message || 'Gagal mencetak test page.';
      setErrorMessage(message);
      setTestPrintStatus('error');
      setTimeout(() => setTestPrintStatus('idle'), 4000);
    }
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

  const getDeviceIcon = (type: ConnectionType) => {
    switch (type) {
      case 'usb':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v6" /><circle cx="12" cy="10" r="2" /><path d="M12 12v4" /><rect x="7" y="14" width="10" height="4" rx="1" />
          </svg>
        );
      case 'lan':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
        );
      case 'bluetooth':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
          </svg>
        );
    }
  };

  const renderLanInputFields = () => {
    const status = connectionStatus['lan'];
    return (
      <div className="lan-input-section">
        <div className="lan-input-row">
          <div className="lan-input-group">
            <label>IP Address</label>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={lanIpAddress}
              onChange={(e) => setLanIpAddress(e.target.value)}
              disabled={status === 'connected'}
              className="lan-input"
            />
          </div>
          <div className="lan-input-group lan-port-group">
            <label>Port</label>
            <input
              type="text"
              placeholder="9100"
              value={lanPort}
              onChange={(e) => setLanPort(e.target.value)}
              disabled={status === 'connected'}
              className="lan-input"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderDetectionPanel = (type: ConnectionType) => {
    const devices = detectedDevices[type];
    const isScanning = scanningType === type;
    const selected = selectedDevice[type];
    const scanned = hasScanned[type];
    const status = connectionStatus[type];

    return (
      <div className="detection-panel">
        {/* LAN IP Input (only for LAN type) */}
        {type === 'lan' && renderLanInputFields()}

        {/* Detect Button */}
        <div className="detection-header">
          <button
            className={`btn-scan ${isScanning ? 'scanning' : ''}`}
            onClick={() => handleDetectDevices(type)}
            disabled={isScanning || status === 'connected'}
          >
            {isScanning ? (
              <>
                <span className="scan-spinner"></span>
                Memindai Perangkat...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9" />
                  <path d="M21 3v6h-6" />
                </svg>
                {scanned ? 'Deteksi Ulang' : type === 'lan' ? 'Cek Koneksi' : 'Deteksi Perangkat'}
              </>
            )}
          </button>
          {scanned && !isScanning && (
            <span className="device-count">
              {devices.length} perangkat ditemukan
            </span>
          )}
        </div>

        {/* Scanning Animation */}
        {isScanning && (
          <div className="scanning-indicator">
            <div className="scanning-waves">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Mencari perangkat {type === 'usb' ? 'USB yang terhubung' : type === 'lan' ? 'di jaringan lokal' : 'Bluetooth di sekitar'}...</p>
          </div>
        )}

        {/* Device List */}
        {!isScanning && scanned && (
          <div className="device-list">
            {devices.length === 0 ? (
              <div className="no-devices">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Tidak ada perangkat ditemukan</span>
                <span className="no-devices-hint">Pastikan perangkat sudah dinyalakan dan {type === 'usb' ? 'terhubung via kabel USB' : type === 'lan' ? 'IP address dan port benar' : 'Bluetooth aktif'}</span>
              </div>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className={`device-item ${selected === device.id ? 'selected' : ''} ${status === 'connected' && selected === device.id ? 'connected-device' : ''}`}
                  onClick={() => {
                    if (status !== 'connected') {
                      setSelectedDevice((prev) => ({ ...prev, [type]: device.id }));
                    }
                  }}
                >
                  <div className="device-item-icon">
                    {getDeviceIcon(type)}
                  </div>
                  <div className="device-item-info">
                    <span className="device-item-name">{device.name}</span>
                    <span className="device-item-address">{device.address}</span>
                  </div>
                  {selected === device.id && (
                    <div className="device-item-check">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Initial State (before first scan) */}
        {!isScanning && !scanned && (
          <div className="detection-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Klik "{type === 'lan' ? 'Cek Koneksi' : 'Deteksi Perangkat'}" untuk memindai perangkat {type === 'usb' ? 'USB' : type === 'lan' ? 'di jaringan' : 'Bluetooth'} yang tersedia</span>
          </div>
        )}
      </div>
    );
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

      {/* Error Alert */}
      {errorMessage && (
        <div className="error-alert">
          <div className="error-alert-content">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button className="error-alert-close" onClick={() => setErrorMessage(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Connection Cards */}
      <div className="connection-cards">
        {connectionTypes.map((conn) => {
          const status = connectionStatus[conn.id];
          const isExpanded = activeConnection === conn.id;
          const selected = selectedDevice[conn.id];

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
                  {renderDetectionPanel(conn.id)}

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
                        disabled={status === 'connecting' || !selected}
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
            disabled={testPrintStatus === 'printing' || !anyConnected}
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
