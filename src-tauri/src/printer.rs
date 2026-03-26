use serde::{Deserialize, Serialize};
use tauri::State;

// Re-export for use in lib.rs
pub use state::PrinterState;

// ─── Data Models ────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedDevice {
    pub id: String,
    pub name: String,
    pub address: String,
    #[serde(rename = "type")]
    pub device_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeviceConfig {
    pub connection_type: String, // "usb" | "lan" | "bluetooth"
    pub address: String,         // COM port, IP:port, or BT address
}

// ─── Printer State ──────────────────────────────────────────

mod state {
    #[derive(Debug)]
    pub enum ActiveConnection {
        Usb {
            port_name: String,
        },
        Lan {
            address: String,
        },
        Bluetooth {
            address: String,
        },
    }

    #[derive(Debug, Default)]
    pub struct PrinterState {
        pub active: Option<ActiveConnection>,
    }
}

// ─── ESC/POS Helpers ────────────────────────────────────────

/// ESC/POS command bytes
mod escpos {
    /// Initialize printer: ESC @
    pub const INIT: &[u8] = &[0x1B, 0x40];
    /// Line feed: LF
    pub const LF: &[u8] = &[0x0A];
    /// Full paper cut: GS V 0
    pub const CUT: &[u8] = &[0x1D, 0x56, 0x00];
    /// Select bold: ESC E 1
    pub const BOLD_ON: &[u8] = &[0x1B, 0x45, 0x01];
    /// Cancel bold: ESC E 0
    pub const BOLD_OFF: &[u8] = &[0x1B, 0x45, 0x00];
    /// Center alignment: ESC a 1
    pub const ALIGN_CENTER: &[u8] = &[0x1B, 0x61, 0x01];
    /// Left alignment: ESC a 0
    pub const ALIGN_LEFT: &[u8] = &[0x1B, 0x61, 0x00];
    /// Double-height text: ESC ! 0x10
    pub const DOUBLE_HEIGHT: &[u8] = &[0x1B, 0x21, 0x10];
    /// Normal size text: ESC ! 0x00
    pub const NORMAL_SIZE: &[u8] = &[0x1B, 0x21, 0x00];
}

/// Build a test receipt as raw ESC/POS bytes
fn build_test_receipt() -> Vec<u8> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let separator = "================================";

    let mut buf: Vec<u8> = Vec::with_capacity(512);

    // Initialize
    buf.extend_from_slice(escpos::INIT);

    // Header - centered, bold, double height
    buf.extend_from_slice(escpos::ALIGN_CENTER);
    buf.extend_from_slice(escpos::BOLD_ON);
    buf.extend_from_slice(escpos::DOUBLE_HEIGHT);
    buf.extend_from_slice(b"SELLORA POS");
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::NORMAL_SIZE);
    buf.extend_from_slice(escpos::BOLD_OFF);
    buf.extend_from_slice(escpos::LF);

    // Separator
    buf.extend_from_slice(separator.as_bytes());
    buf.extend_from_slice(escpos::LF);

    // Body - left aligned
    buf.extend_from_slice(escpos::ALIGN_LEFT);
    buf.extend_from_slice(b"Test Print Berhasil!");
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);

    buf.extend_from_slice(b"Printer terhubung dan");
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(b"berfungsi dengan baik.");
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);

    // Separator
    buf.extend_from_slice(escpos::ALIGN_CENTER);
    buf.extend_from_slice(separator.as_bytes());
    buf.extend_from_slice(escpos::LF);

    // Timestamp
    buf.extend_from_slice(escpos::ALIGN_LEFT);
    buf.extend_from_slice(format!("Waktu: {}", now).as_bytes());
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);

    // Footer
    buf.extend_from_slice(escpos::ALIGN_CENTER);
    buf.extend_from_slice(b"-- Terima Kasih --");
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);
    buf.extend_from_slice(escpos::LF);

    // Paper cut
    buf.extend_from_slice(escpos::CUT);

    buf
}

// ─── USB / Serial Port Functions ────────────────────────────

fn list_serial_ports_internal() -> Result<Vec<DetectedDevice>, String> {
    let ports = serialport::available_ports()
        .map_err(|e| format!("Gagal mendeteksi port serial: {}", e))?;

    // Only show ports with actual USB devices connected
    // Skip Unknown, PciPort, BluetoothPort — those are not USB-connected devices
    let devices: Vec<DetectedDevice> = ports
        .into_iter()
        .filter_map(|p| {
            match &p.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    let product = info.product.as_deref().unwrap_or("USB Device");
                    let manufacturer = info.manufacturer.as_deref().unwrap_or("");
                    let name = if manufacturer.is_empty() {
                        format!("{} ({})", product, p.port_name)
                    } else {
                        format!("{} {} ({})", manufacturer, product, p.port_name)
                    };

                    Some(DetectedDevice {
                        id: format!("usb-{}", p.port_name),
                        name,
                        address: p.port_name,
                        device_type: "usb".to_string(),
                    })
                }
                // Skip non-USB port types
                _ => None,
            }
        })
        .collect();

    Ok(devices)
}

fn connect_usb(port_name: &str) -> Result<(), String> {
    // Validate port exists by trying to open it briefly
    let port = serialport::new(port_name, 9600)
        .timeout(std::time::Duration::from_secs(3))
        .open()
        .map_err(|e| match e.kind() {
            serialport::ErrorKind::NoDevice => {
                format!("Port {} tidak ditemukan. Pastikan printer terhubung via USB.", port_name)
            }
            serialport::ErrorKind::InvalidInput => {
                format!("Port {} tidak valid.", port_name)
            }
            serialport::ErrorKind::Io(io_kind) => match io_kind {
                std::io::ErrorKind::PermissionDenied => {
                    format!("Akses ke port {} ditolak. Port mungkin sedang digunakan aplikasi lain.", port_name)
                }
                _ => format!("Gagal membuka port {}: {}", port_name, e),
            },
            _ => format!("Gagal membuka port {}: {}", port_name, e),
        })?;
    drop(port); // Close the test connection
    Ok(())
}

fn send_usb(port_name: &str, data: &[u8]) -> Result<(), String> {
    let mut port = serialport::new(port_name, 9600)
        .timeout(std::time::Duration::from_secs(5))
        .open()
        .map_err(|e| format!("Gagal membuka port {}: {}", port_name, e))?;

    use std::io::Write;
    port.write_all(data)
        .map_err(|e| format!("Gagal mengirim data ke printer USB: {}", e))?;
    port.flush()
        .map_err(|e| format!("Gagal flush data ke printer USB: {}", e))?;

    Ok(())
}

// ─── LAN / Network Functions ────────────────────────────────

async fn connect_lan(address: &str) -> Result<(), String> {
    use tokio::time::timeout;
    use std::time::Duration;

    let connect_result = timeout(
        Duration::from_secs(5),
        tokio::net::TcpStream::connect(address),
    )
    .await;

    match connect_result {
        Ok(Ok(_stream)) => {
            // Connection successful, drop stream (just validation)
            Ok(())
        }
        Ok(Err(e)) => {
            Err(format!(
                "Gagal terhubung ke printer di {}. Pastikan IP dan port benar. Error: {}",
                address, e
            ))
        }
        Err(_) => {
            Err(format!(
                "Koneksi ke {} timeout (5 detik). Pastikan printer menyala dan terhubung ke jaringan yang sama.",
                address
            ))
        }
    }
}

async fn send_lan(address: &str, data: &[u8]) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;
    use tokio::time::timeout;
    use std::time::Duration;

    let connect_result = timeout(
        Duration::from_secs(5),
        tokio::net::TcpStream::connect(address),
    )
    .await;

    let mut stream = match connect_result {
        Ok(Ok(s)) => s,
        Ok(Err(e)) => {
            return Err(format!("Gagal terhubung ke printer di {}: {}", address, e));
        }
        Err(_) => {
            return Err(format!("Koneksi ke {} timeout. Printer mungkin offline.", address));
        }
    };

    stream.write_all(data).await
        .map_err(|e| format!("Gagal mengirim data ke printer LAN: {}", e))?;
    stream.flush().await
        .map_err(|e| format!("Gagal flush data ke printer LAN: {}", e))?;

    Ok(())
}

// ─── Bluetooth Functions ────────────────────────────────────

async fn scan_bluetooth_internal() -> Result<Vec<DetectedDevice>, String> {
    use btleplug::api::{Central, Manager as _, ScanFilter};
    use btleplug::platform::Manager;
    use std::time::Duration;

    let manager = Manager::new().await
        .map_err(|e| format!("Gagal inisialisasi Bluetooth manager: {}", e))?;

    let adapters = manager.adapters().await
        .map_err(|e| format!("Gagal mendapatkan Bluetooth adapter: {}. Pastikan Bluetooth aktif.", e))?;

    let adapter = adapters.into_iter().next()
        .ok_or_else(|| "Tidak ada Bluetooth adapter ditemukan. Pastikan Bluetooth aktif di perangkat Anda.".to_string())?;

    // Start scanning — 8 seconds gives BLE devices enough time to broadcast names
    adapter.start_scan(ScanFilter::default()).await
        .map_err(|e| format!("Gagal memulai scan Bluetooth: {}", e))?;

    tokio::time::sleep(Duration::from_secs(8)).await;

    let _ = adapter.stop_scan().await;

    let peripherals = adapter.peripherals().await
        .map_err(|e| format!("Gagal mendapatkan daftar perangkat Bluetooth: {}", e))?;

    let mut devices = Vec::new();
    for peripheral in peripherals {
        use btleplug::api::Peripheral;
        let properties = peripheral.properties().await
            .map_err(|e| format!("Gagal membaca properti perangkat: {}", e))?;

        if let Some(props) = properties {
            // Only show devices that broadcast their name
            // Devices without a name are not useful (user can't distinguish them)
            // Printers/peripherals typically always advertise their name
            if let Some(name) = props.local_name {
                let address = props.address.to_string();

                devices.push(DetectedDevice {
                    id: format!("bt-{}", address.replace(':', "")),
                    name,
                    address,
                    device_type: "bluetooth".to_string(),
                });
            }
        }
    }

    Ok(devices)
}

async fn connect_bluetooth(address: &str) -> Result<(), String> {
    use btleplug::api::{Central, Manager as _, Peripheral, ScanFilter};
    use btleplug::platform::Manager;
    use std::time::Duration;

    let manager = Manager::new().await
        .map_err(|e| format!("Gagal inisialisasi Bluetooth: {}", e))?;

    let adapters = manager.adapters().await
        .map_err(|e| format!("Bluetooth adapter tidak tersedia: {}", e))?;

    let adapter = adapters.into_iter().next()
        .ok_or_else(|| "Bluetooth adapter tidak ditemukan.".to_string())?;

    // Scan briefly to find the device
    adapter.start_scan(ScanFilter::default()).await
        .map_err(|e| format!("Gagal scan Bluetooth: {}", e))?;
    tokio::time::sleep(Duration::from_secs(3)).await;
    let _ = adapter.stop_scan().await;

    let peripherals = adapter.peripherals().await
        .map_err(|e| format!("Gagal mendapatkan perangkat: {}", e))?;

    let target = peripherals.into_iter().find(|p| {
        // Compare address (blocking on properties is ok here - we already scanned)
        if let Ok(Some(props)) = futures::executor::block_on(p.properties()) {
            props.address.to_string() == address
        } else {
            false
        }
    });

    let peripheral = target
        .ok_or_else(|| format!("Perangkat Bluetooth {} tidak ditemukan. Pastikan perangkat menyala dan dalam jangkauan.", address))?;

    peripheral.connect().await
        .map_err(|e| format!("Gagal terhubung ke perangkat Bluetooth {}: {}", address, e))?;

    peripheral.discover_services().await
        .map_err(|e| format!("Gagal menemukan layanan pada perangkat Bluetooth: {}", e))?;

    // Disconnect after validation (we'll reconnect for printing)
    let _ = peripheral.disconnect().await;

    Ok(())
}

async fn send_bluetooth(address: &str, data: &[u8]) -> Result<(), String> {
    use btleplug::api::{Central, Manager as _, Peripheral, ScanFilter, WriteType};
    use btleplug::platform::Manager;
    use std::time::Duration;

    let manager = Manager::new().await
        .map_err(|e| format!("Gagal inisialisasi Bluetooth: {}", e))?;

    let adapters = manager.adapters().await
        .map_err(|e| format!("Bluetooth adapter tidak tersedia: {}", e))?;

    let adapter = adapters.into_iter().next()
        .ok_or_else(|| "Bluetooth adapter tidak ditemukan.".to_string())?;

    adapter.start_scan(ScanFilter::default()).await
        .map_err(|e| format!("Gagal scan Bluetooth: {}", e))?;
    tokio::time::sleep(Duration::from_secs(3)).await;
    let _ = adapter.stop_scan().await;

    let peripherals = adapter.peripherals().await
        .map_err(|e| format!("Gagal mendapatkan perangkat: {}", e))?;

    let target = peripherals.into_iter().find(|p| {
        if let Ok(Some(props)) = futures::executor::block_on(p.properties()) {
            props.address.to_string() == address
        } else {
            false
        }
    });

    let peripheral = target
        .ok_or_else(|| format!("Perangkat Bluetooth {} tidak ditemukan.", address))?;

    peripheral.connect().await
        .map_err(|e| format!("Gagal terhubung ke Bluetooth {}: {}", address, e))?;

    peripheral.discover_services().await
        .map_err(|e| format!("Gagal menemukan layanan Bluetooth: {}", e))?;

    // Find a writable characteristic (common for BLE printers)
    let chars = peripheral.services().iter()
        .flat_map(|s| s.characteristics.clone())
        .collect::<Vec<_>>();

    let writable = chars.iter().find(|c| {
        use btleplug::api::CharPropFlags;
        c.properties.contains(CharPropFlags::WRITE)
            || c.properties.contains(CharPropFlags::WRITE_WITHOUT_RESPONSE)
    });

    let characteristic = writable
        .ok_or_else(|| "Tidak menemukan characteristic yang bisa ditulis pada perangkat Bluetooth. Perangkat mungkin bukan printer.".to_string())?;

    // Send data in chunks (BLE has MTU limits, typically ~20 bytes)
    let chunk_size = 20;
    for chunk in data.chunks(chunk_size) {
        peripheral.write(characteristic, chunk, WriteType::WithoutResponse).await
            .map_err(|e| format!("Gagal mengirim data via Bluetooth: {}", e))?;
        tokio::time::sleep(Duration::from_millis(50)).await;
    }

    let _ = peripheral.disconnect().await;

    Ok(())
}

// ─── Tauri Commands ─────────────────────────────────────────

use crate::AppState;

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<DetectedDevice>, String> {
    list_serial_ports_internal()
}

#[tauri::command]
pub async fn scan_lan_devices(ip: String, port: Option<u16>) -> Result<Vec<DetectedDevice>, String> {
    let port = port.unwrap_or(9100);
    let address = format!("{}:{}", ip.trim(), port);

    // Try to connect to validate the printer is there
    match connect_lan(&address).await {
        Ok(()) => {
            Ok(vec![DetectedDevice {
                id: format!("lan-{}", ip.trim().replace('.', "")),
                name: format!("Network Printer ({})", address),
                address,
                device_type: "lan".to_string(),
            }])
        }
        Err(e) => {
            // Return empty list with the error info rather than failing entirely
            Err(format!("Printer tidak ditemukan di {}. {}", address, e))
        }
    }
}

#[tauri::command]
pub async fn scan_bluetooth_devices() -> Result<Vec<DetectedDevice>, String> {
    scan_bluetooth_internal().await
}

#[tauri::command]
pub async fn connect_device(
    state: State<'_, AppState>,
    config: DeviceConfig,
) -> Result<String, String> {
    let connection_type = config.connection_type.to_lowercase();
    let address = config.address.trim().to_string();

    if address.is_empty() {
        return Err("Alamat perangkat tidak boleh kosong.".to_string());
    }

    match connection_type.as_str() {
        "usb" => {
            connect_usb(&address)?;
            let mut printer_state = state.printer_state.lock()
                .map_err(|e| format!("Gagal mengakses printer state: {}", e))?;
            printer_state.active = Some(state::ActiveConnection::Usb {
                port_name: address.clone(),
            });
            Ok(format!("Terhubung ke printer USB di {}", address))
        }
        "lan" => {
            // Ensure address has port
            let full_address = if address.contains(':') {
                address.clone()
            } else {
                format!("{}:9100", address)
            };
            connect_lan(&full_address).await?;
            let mut printer_state = state.printer_state.lock()
                .map_err(|e| format!("Gagal mengakses printer state: {}", e))?;
            printer_state.active = Some(state::ActiveConnection::Lan {
                address: full_address.clone(),
            });
            Ok(format!("Terhubung ke printer LAN di {}", full_address))
        }
        "bluetooth" => {
            connect_bluetooth(&address).await?;
            let mut printer_state = state.printer_state.lock()
                .map_err(|e| format!("Gagal mengakses printer state: {}", e))?;
            printer_state.active = Some(state::ActiveConnection::Bluetooth {
                address: address.clone(),
            });
            Ok(format!("Terhubung ke printer Bluetooth {}", address))
        }
        _ => Err(format!("Tipe koneksi '{}' tidak dikenal. Gunakan 'usb', 'lan', atau 'bluetooth'.", connection_type)),
    }
}

#[tauri::command]
pub fn disconnect_device(state: State<'_, AppState>) -> Result<String, String> {
    let mut printer_state = state.printer_state.lock()
        .map_err(|e| format!("Gagal mengakses printer state: {}", e))?;

    if printer_state.active.is_none() {
        return Err("Tidak ada printer yang terhubung.".to_string());
    }

    printer_state.active = None;
    Ok("Printer berhasil diputuskan.".to_string())
}

#[tauri::command]
pub async fn test_print_device(state: State<'_, AppState>) -> Result<String, String> {
    // Read the active connection info (then release the lock before async operations)
    let connection_info = {
        let printer_state = state.printer_state.lock()
            .map_err(|e| format!("Gagal mengakses printer state: {}", e))?;

        match &printer_state.active {
            Some(state::ActiveConnection::Usb { port_name }) => {
                ("usb".to_string(), port_name.clone())
            }
            Some(state::ActiveConnection::Lan { address }) => {
                ("lan".to_string(), address.clone())
            }
            Some(state::ActiveConnection::Bluetooth { address }) => {
                ("bluetooth".to_string(), address.clone())
            }
            None => {
                return Err("Tidak ada printer yang terhubung. Hubungkan printer terlebih dahulu.".to_string());
            }
        }
    };

    let receipt = build_test_receipt();
    let (conn_type, address) = connection_info;

    match conn_type.as_str() {
        "usb" => {
            send_usb(&address, &receipt)?;
            Ok("Test print USB berhasil dikirim!".to_string())
        }
        "lan" => {
            send_lan(&address, &receipt).await?;
            Ok("Test print LAN berhasil dikirim!".to_string())
        }
        "bluetooth" => {
            send_bluetooth(&address, &receipt).await?;
            Ok("Test print Bluetooth berhasil dikirim!".to_string())
        }
        _ => Err("Tipe koneksi tidak valid.".to_string()),
    }
}
