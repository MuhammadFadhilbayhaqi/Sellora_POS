use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Local;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;

mod printer;

// App state to hold DB connection and current session
pub struct AppState {
    pub db: Mutex<Connection>,
    pub current_user: Mutex<Option<UserInfo>>,
    pub printer_state: Mutex<printer::PrinterState>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserInfo {
    pub id: i64,
    pub nama: String,
    pub username: String,
}

// ─── Data Models ────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub category_name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Unit {
    pub id: String,
    pub unit_name: String,
    pub unit_symbol: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub product_name: String,
    pub category_id: Option<String>,
    pub unit_id: Option<String>,
    pub description: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    // Joined fields
    #[serde(skip_deserializing)]
    pub category_name: Option<String>,
    #[serde(skip_deserializing)]
    pub unit_name: Option<String>,
    #[serde(skip_deserializing)]
    pub variant_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariant {
    pub id: String,
    pub product_id: String,
    pub variant_name: String,
    pub sku: String,
    pub barcode: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

// ─── Inventory Models ───────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct InventoryItem {
    pub variant_id: String,
    pub product_name: String,
    pub variant_name: String,
    pub sku: String,
    pub quantity: f64,
    pub price: f64,
    pub cost: f64,
    pub category_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryMovement {
    pub id: String,
    pub variant_id: String,
    pub movement_type: String,
    pub quantity: f64,
    pub reference_type: String,
    pub reference_id: String,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Supplier {
    pub id: String,
    pub supplier_name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PurchaseOrder {
    pub id: String,
    pub order_number: String,
    pub supplier_id: Option<String>,
    pub status: String,
    pub total_amount: f64,
    pub ordered_at: String,
    pub received_at: Option<String>,
    pub created_at: String,
    // joined
    #[serde(skip_deserializing)]
    pub supplier_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseOrderItem {
    pub id: String,
    pub purchase_order_id: String,
    pub variant_id: String,
    pub quantity_ordered: f64,
    pub quantity_received: f64,
    pub unit_price: f64,
    pub subtotal: f64,
    pub created_at: String,
    // joined
    #[serde(skip_deserializing)]
    pub product_name: Option<String>,
    #[serde(skip_deserializing)]
    pub variant_name: Option<String>,
    #[serde(skip_deserializing)]
    pub sku: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryAdjustment {
    pub id: String,
    pub variant_id: String,
    pub old_quantity: f64,
    pub new_quantity: f64,
    pub difference: f64,
    pub reason: String,
    pub adjusted_by: Option<String>,
    pub created_at: String,
    // joined
    pub product_name: Option<String>,
    pub variant_name: Option<String>,
    pub sku: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct InventoryWaste {
    pub id: String,
    pub variant_id: String,
    pub quantity: f64,
    pub waste_type: String,
    pub reason: String,
    pub reported_by: Option<String>,
    pub created_at: String,
    // joined
    pub product_name: Option<String>,
    pub variant_name: Option<String>,
    pub sku: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMethod {
    pub id: String,
    pub method_name: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tax {
    pub id: String,
    pub tax_name: String,
    pub tax_rate: f64,
    pub tax_type: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Transaction {
    pub id: String,
    pub invoice_number: String,
    pub subtotal: f64,
    pub discount_total: f64,
    pub tax_total: f64,
    pub grand_total: f64,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TransactionItem {
    pub id: String,
    pub variant_id: String,
    pub price: f64,
    pub quantity: f64,
    pub discount: f64,
    pub tax: f64,
    pub subtotal: f64,
    // joined
    pub product_name: Option<String>,
    pub variant_name: Option<String>,
    pub sku: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TransactionPayment {
    pub id: String,
    pub method_name: Option<String>,
    pub amount: f64,
    pub reference_number: String,
    pub paid_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CartItemInput {
    pub variant_id: String,
    pub quantity: f64,
    pub price: f64,
    pub discount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessProfile {
    pub id: String,
    pub business_name: String,
    pub contact_number: String,
    pub email: String,
    pub business_category: String,
    pub address: String,
    pub logo_base64: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAccount {
    pub id: i64,
    pub nama: String,
    pub username: String,
    pub email: String,
    pub phone: String,
}

// ─── Database Initialization ────────────────────────────────

fn init_db(db: &Connection) {
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            category_name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS units (
            id TEXT PRIMARY KEY,
            unit_name TEXT NOT NULL,
            unit_symbol TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            sku TEXT NOT NULL,
            product_name TEXT NOT NULL,
            category_id TEXT,
            unit_id TEXT,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS product_variants (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            variant_name TEXT NOT NULL,
            sku TEXT NOT NULL DEFAULT '',
            barcode TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_prices (
            id TEXT PRIMARY KEY,
            variant_id TEXT NOT NULL,
            store_id TEXT,
            price REAL NOT NULL DEFAULT 0,
            cost REAL NOT NULL DEFAULT 0,
            effective_from TEXT,
            effective_to TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory_movements (
            id TEXT PRIMARY KEY,
            variant_id TEXT NOT NULL,
            movement_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            reference_type TEXT NOT NULL DEFAULT '',
            reference_id TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            supplier_name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS purchase_orders (
            id TEXT PRIMARY KEY,
            order_number TEXT NOT NULL,
            supplier_id TEXT,
            store_id TEXT,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            total_amount REAL NOT NULL DEFAULT 0,
            ordered_at TEXT NOT NULL,
            received_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id TEXT PRIMARY KEY,
            purchase_order_id TEXT NOT NULL,
            variant_id TEXT NOT NULL,
            quantity_ordered REAL NOT NULL DEFAULT 0,
            quantity_received REAL NOT NULL DEFAULT 0,
            unit_price REAL NOT NULL DEFAULT 0,
            subtotal REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory_adjustments (
            id TEXT PRIMARY KEY,
            variant_id TEXT NOT NULL,
            old_quantity REAL NOT NULL DEFAULT 0,
            new_quantity REAL NOT NULL DEFAULT 0,
            difference REAL NOT NULL DEFAULT 0,
            reason TEXT NOT NULL DEFAULT '',
            adjusted_by TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory_waste (
            id TEXT PRIMARY KEY,
            variant_id TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            waste_type TEXT NOT NULL DEFAULT '',
            reason TEXT NOT NULL DEFAULT '',
            reported_by TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS payment_methods (
            id TEXT PRIMARY KEY,
            method_name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'CASH',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS taxes (
            id TEXT PRIMARY KEY,
            tax_name TEXT NOT NULL,
            tax_rate REAL NOT NULL DEFAULT 0,
            tax_type TEXT NOT NULL DEFAULT 'PERCENTAGE',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            invoice_number TEXT NOT NULL,
            cashier_id INTEGER,
            subtotal REAL NOT NULL DEFAULT 0,
            discount_total REAL NOT NULL DEFAULT 0,
            tax_total REAL NOT NULL DEFAULT 0,
            grand_total REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'OPEN',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transaction_items (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            variant_id TEXT NOT NULL,
            price REAL NOT NULL DEFAULT 0,
            quantity REAL NOT NULL DEFAULT 0,
            discount REAL NOT NULL DEFAULT 0,
            tax REAL NOT NULL DEFAULT 0,
            subtotal REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transaction_payments (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            payment_method_id TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            reference_number TEXT NOT NULL DEFAULT '',
            paid_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
            FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
        );

        CREATE TABLE IF NOT EXISTS transaction_taxes (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            tax_name TEXT NOT NULL,
            tax_rate REAL NOT NULL DEFAULT 0,
            tax_amount REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS transaction_refunds (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            refund_reason TEXT NOT NULL DEFAULT '',
            refund_amount REAL NOT NULL DEFAULT 0,
            refunded_by INTEGER,
            refunded_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS business_profiles (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            business_name TEXT NOT NULL DEFAULT '',
            contact_number TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            business_category TEXT NOT NULL DEFAULT '',
            address TEXT NOT NULL DEFAULT '',
            logo_base64 TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id)
        );

        PRAGMA foreign_keys = ON;",
    )
    .expect("Failed to create tables");

    // Migration: add email and phone columns to users table
    let _ = db.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''", []);
    let _ = db.execute("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''", []);
}

// ─── Helper: Generate SKU ───────────────────────────────────

fn generate_sku(db: &Connection, product_name: &str) -> String {
    // Take first 6 chars of product name, uppercase, remove spaces
    let abbrev: String = product_name
        .chars()
        .filter(|c| !c.is_whitespace())
        .take(6)
        .collect::<String>()
        .to_uppercase();

    // Count existing products to get sequential number
    let count: i64 = db
        .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
        .unwrap_or(0);

    let now = Local::now();
    let date_part = now.format("%y%m%d").to_string();

    format!("{}-{:03}-{}", abbrev, count + 1, date_part)
}

fn now_timestamp() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

// ─── Helper: Generate EAN-13 Barcode ────────────────────────

fn generate_ean13() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    // Generate 12 digits from timestamp-based seed
    let base: u64 = (seed % 1_000_000_000_000) as u64;
    let digits_str = format!("{:012}", base);
    let digits: Vec<u32> = digits_str.chars().map(|c| c.to_digit(10).unwrap_or(0)).collect();

    // Calculate EAN-13 check digit
    let mut sum = 0u32;
    for (i, d) in digits.iter().enumerate() {
        if i % 2 == 0 {
            sum += d;
        } else {
            sum += d * 3;
        }
    }
    let check_digit = (10 - (sum % 10)) % 10;

    format!("{}{}", digits_str, check_digit)
}

// ─── Helper: Get current user ID from session ───────────────

fn get_current_user_id(state: &AppState) -> Result<i64, String> {
    let current_user = state.current_user.lock().map_err(|e| format!("Session error: {}", e))?;
    match &*current_user {
        Some(user) => Ok(user.id),
        None => Err("Belum login".into()),
    }
}

// ─── Auth Commands (unchanged) ──────────────────────────────

#[tauri::command]
fn register(
    state: State<AppState>,
    nama: String,
    username: String,
    password: String,
) -> Result<String, String> {
    let nama = nama.trim().to_string();
    let username = username.trim().to_string();

    if nama.is_empty() || username.is_empty() || password.is_empty() {
        return Err("Semua field harus diisi".into());
    }

    if password.len() < 6 {
        return Err("Password minimal 6 karakter".into());
    }

    let password_hash = hash(&password, DEFAULT_COST).map_err(|e| format!("Hash error: {}", e))?;

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.execute(
        "INSERT INTO users (nama, username, password_hash) VALUES (?1, ?2, ?3)",
        rusqlite::params![nama, username, password_hash],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            "Username sudah terdaftar".to_string()
        } else {
            format!("Register gagal: {}", e)
        }
    })?;

    Ok("Registrasi berhasil".into())
}

#[tauri::command]
fn login(
    state: State<AppState>,
    username: String,
    password: String,
) -> Result<UserInfo, String> {
    let username = username.trim().to_string();

    if username.is_empty() || password.is_empty() {
        return Err("Username dan password harus diisi".into());
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare("SELECT id, nama, username, password_hash FROM users WHERE username = ?1")
        .map_err(|e| format!("Query error: {}", e))?;

    let result = stmt
        .query_row(rusqlite::params![username], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|_| "Username atau password salah".to_string())?;

    let (id, nama, uname, password_hash) = result;

    let is_valid =
        verify(&password, &password_hash).map_err(|e| format!("Verify error: {}", e))?;

    if !is_valid {
        return Err("Username atau password salah".into());
    }

    let user = UserInfo {
        id,
        nama,
        username: uname,
    };

    // Save session
    let mut current_user = state
        .current_user
        .lock()
        .map_err(|e| format!("Session error: {}", e))?;
    *current_user = Some(user.clone());

    Ok(user)
}

#[tauri::command]
fn check_auth(state: State<AppState>) -> Result<UserInfo, String> {
    let current_user = state
        .current_user
        .lock()
        .map_err(|e| format!("Session error: {}", e))?;

    match &*current_user {
        Some(user) => Ok(user.clone()),
        None => Err("Belum login".into()),
    }
}

#[tauri::command]
fn logout(state: State<AppState>) -> Result<String, String> {
    let mut current_user = state
        .current_user
        .lock()
        .map_err(|e| format!("Session error: {}", e))?;
    *current_user = None;
    Ok("Logout berhasil".into())
}

// ─── Supplier Commands ──────────────────────────────────────

#[tauri::command]
fn get_suppliers(state: State<AppState>) -> Result<Vec<Supplier>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare("SELECT id, supplier_name, contact_person, phone, email, address, created_at, updated_at FROM suppliers WHERE user_id = ?1 ORDER BY supplier_name ASC").map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(Supplier {
            id: row.get(0)?,
            supplier_name: row.get(1)?,
            contact_person: row.get(2)?,
            phone: row.get(3)?,
            email: row.get(4)?,
            address: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(list)
}

#[tauri::command]
fn add_supplier(state: State<AppState>, payload: Supplier) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    db.execute(
        "INSERT INTO suppliers (id, supplier_name, contact_person, phone, email, address, created_at, updated_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![Uuid::new_v4().to_string(), payload.supplier_name, payload.contact_person, payload.phone, payload.email, payload.address, now, now, user_id],
    ).map_err(|e| format!("Gagal tambah supplier: {}", e))?;
    Ok("Supplier berhasil ditambahkan".into())
}

#[tauri::command]
fn update_supplier(state: State<AppState>, payload: Supplier) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    db.execute(
        "UPDATE suppliers SET supplier_name = ?1, contact_person = ?2, phone = ?3, email = ?4, address = ?5, updated_at = ?6 WHERE id = ?7 AND user_id = ?8",
        rusqlite::params![payload.supplier_name, payload.contact_person, payload.phone, payload.email, payload.address, now, payload.id, user_id],
    ).map_err(|e| format!("Gagal update supplier: {}", e))?;
    Ok("Supplier berhasil diupdate".into())
}

#[tauri::command]
fn delete_supplier(state: State<AppState>, id: String) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db.execute("DELETE FROM suppliers WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id])
        .map_err(|e| format!("Gagal hapus supplier: {}", e))?;
    Ok("Supplier berhasil dihapus".into())
}

// ─── Category Commands ──────────────────────────────────────

#[tauri::command]
fn get_categories(state: State<AppState>) -> Result<Vec<Category>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare("SELECT id, category_name, created_at, updated_at FROM categories WHERE user_id = ?1 ORDER BY category_name ASC")
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(Category {
                id: row.get(0)?,
                category_name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut categories = Vec::new();
    for row in rows {
        categories.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(categories)
}

#[tauri::command]
fn add_category(state: State<AppState>, category_name: String) -> Result<Category, String> {
    let category_name = category_name.trim().to_string();
    if category_name.is_empty() {
        return Err("Nama kategori harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = now_timestamp();

    db.execute(
        "INSERT INTO categories (id, category_name, created_at, updated_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, category_name, now, now, user_id],
    )
    .map_err(|e| format!("Gagal menambah kategori: {}", e))?;

    Ok(Category {
        id,
        category_name,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn update_category(
    state: State<AppState>,
    id: String,
    category_name: String,
) -> Result<String, String> {
    let category_name = category_name.trim().to_string();
    if category_name.is_empty() {
        return Err("Nama kategori harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    let affected = db
        .execute(
            "UPDATE categories SET category_name = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4",
            rusqlite::params![category_name, now, id, user_id],
        )
        .map_err(|e| format!("Gagal mengupdate kategori: {}", e))?;

    if affected == 0 {
        return Err("Kategori tidak ditemukan".into());
    }

    Ok("Kategori berhasil diupdate".into())
}

#[tauri::command]
fn delete_category(state: State<AppState>, id: String) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let affected = db
        .execute("DELETE FROM categories WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id])
        .map_err(|e| format!("Gagal menghapus kategori: {}", e))?;

    if affected == 0 {
        return Err("Kategori tidak ditemukan".into());
    }

    Ok("Kategori berhasil dihapus".into())
}

// ─── Unit Commands ──────────────────────────────────────────

#[tauri::command]
fn get_units(state: State<AppState>) -> Result<Vec<Unit>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare("SELECT id, unit_name, unit_symbol, created_at, updated_at FROM units WHERE user_id = ?1 ORDER BY unit_name ASC")
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(Unit {
                id: row.get(0)?,
                unit_name: row.get(1)?,
                unit_symbol: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut units = Vec::new();
    for row in rows {
        units.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(units)
}

#[tauri::command]
fn add_unit(
    state: State<AppState>,
    unit_name: String,
    unit_symbol: String,
) -> Result<Unit, String> {
    let unit_name = unit_name.trim().to_string();
    let unit_symbol = unit_symbol.trim().to_string();

    if unit_name.is_empty() {
        return Err("Nama unit harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = now_timestamp();

    db.execute(
        "INSERT INTO units (id, unit_name, unit_symbol, created_at, updated_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, unit_name, unit_symbol, now, now, user_id],
    )
    .map_err(|e| format!("Gagal menambah unit: {}", e))?;

    Ok(Unit {
        id,
        unit_name,
        unit_symbol,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn update_unit(
    state: State<AppState>,
    id: String,
    unit_name: String,
    unit_symbol: String,
) -> Result<String, String> {
    let unit_name = unit_name.trim().to_string();
    if unit_name.is_empty() {
        return Err("Nama unit harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    let affected = db
        .execute(
            "UPDATE units SET unit_name = ?1, unit_symbol = ?2, updated_at = ?3 WHERE id = ?4 AND user_id = ?5",
            rusqlite::params![unit_name, unit_symbol.trim(), now, id, user_id],
        )
        .map_err(|e| format!("Gagal mengupdate unit: {}", e))?;

    if affected == 0 {
        return Err("Unit tidak ditemukan".into());
    }

    Ok("Unit berhasil diupdate".into())
}

#[tauri::command]
fn delete_unit(state: State<AppState>, id: String) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let affected = db
        .execute("DELETE FROM units WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id])
        .map_err(|e| format!("Gagal menghapus unit: {}", e))?;

    if affected == 0 {
        return Err("Unit tidak ditemukan".into());
    }

    Ok("Unit berhasil dihapus".into())
}

// ─── Product Commands ───────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VariantInput {
    pub variant_name: String,
    pub sku: String,
    pub barcode: String,
    pub price: Option<f64>,
    pub cost: Option<f64>,
}

#[tauri::command]
fn gen_barcode() -> Result<String, String> {
    Ok(generate_ean13())
}

#[tauri::command]
fn get_products(state: State<AppState>) -> Result<Vec<Product>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT p.id, p.sku, p.product_name, p.category_id, p.unit_id,
                    p.description, p.status, p.created_at, p.updated_at,
                    c.category_name, u.unit_name,
                    (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) as variant_count
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN units u ON p.unit_id = u.id
             WHERE p.user_id = ?1
             ORDER BY p.created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(Product {
                id: row.get(0)?,
                sku: row.get(1)?,
                product_name: row.get(2)?,
                category_id: row.get(3)?,
                unit_id: row.get(4)?,
                description: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                category_name: row.get(9)?,
                unit_name: row.get(10)?,
                variant_count: row.get(11)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut products = Vec::new();
    for row in rows {
        products.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(products)
}

#[tauri::command]
fn add_product(
    state: State<AppState>,
    product_name: String,
    category_id: Option<String>,
    unit_id: Option<String>,
    description: String,
    custom_sku: Option<String>,
    has_variants: bool,
    variants: Option<Vec<VariantInput>>,
    barcode: Option<String>,
    price: Option<f64>,
    cost: Option<f64>,
) -> Result<Product, String> {
    let product_name = product_name.trim().to_string();
    if product_name.is_empty() {
        return Err("Nama produk harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let product_id = Uuid::new_v4().to_string();
    let now = now_timestamp();

    // Generate or use custom SKU
    let sku = match custom_sku {
        Some(s) if !s.trim().is_empty() => s.trim().to_string(),
        _ => generate_sku(&db, &product_name),
    };

    // Normalize empty strings to None for FK fields
    let cat_id = category_id.filter(|s| !s.is_empty());
    let u_id = unit_id.filter(|s| !s.is_empty());

    db.execute(
        "INSERT INTO products (id, sku, product_name, category_id, unit_id, description, status, created_at, updated_at, user_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8, ?9)",
        rusqlite::params![product_id, sku, product_name, cat_id, u_id, description.trim(), now, now, user_id],
    )
    .map_err(|e| format!("Gagal menambah produk: {}", e))?;

    if has_variants {
        // Create user-specified variants
        if let Some(variant_list) = variants {
            for v in &variant_list {
                let variant_id = Uuid::new_v4().to_string();
                let v_sku = if v.sku.trim().is_empty() {
                    format!("{}-{}", sku, v.variant_name.trim().to_uppercase().chars().filter(|c| !c.is_whitespace()).take(4).collect::<String>())
                } else {
                    v.sku.trim().to_string()
                };
                db.execute(
                    "INSERT INTO product_variants (id, product_id, variant_name, sku, barcode, status, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7)",
                    rusqlite::params![variant_id, product_id, v.variant_name.trim(), v_sku, v.barcode.trim(), now, now],
                )
                .map_err(|e| format!("Gagal menambah variant: {}", e))?;

                // Create price record for this variant
                let v_price = v.price.unwrap_or(0.0);
                let v_cost = v.cost.unwrap_or(0.0);
                let price_id = Uuid::new_v4().to_string();
                db.execute(
                    "INSERT INTO product_prices (id, variant_id, store_id, price, cost, created_at)
                     VALUES (?1, ?2, NULL, ?3, ?4, ?5)",
                    rusqlite::params![price_id, variant_id, v_price, v_cost, now],
                )
                .map_err(|e| format!("Gagal menambah harga variant: {}", e))?;
            }
        }
    } else {
        // Create default variant
        let variant_id = Uuid::new_v4().to_string();
        let bc = barcode.unwrap_or_default();
        db.execute(
            "INSERT INTO product_variants (id, product_id, variant_name, sku, barcode, status, created_at, updated_at)
             VALUES (?1, ?2, 'Default', ?3, ?4, 'active', ?5, ?6)",
            rusqlite::params![variant_id, product_id, sku, bc.trim(), now, now],
        )
        .map_err(|e| format!("Gagal menambah default variant: {}", e))?;

        // Create price record for default variant
        let p = price.unwrap_or(0.0);
        let c = cost.unwrap_or(0.0);
        let price_id = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO product_prices (id, variant_id, store_id, price, cost, created_at)
             VALUES (?1, ?2, NULL, ?3, ?4, ?5)",
            rusqlite::params![price_id, variant_id, p, c, now],
        )
        .map_err(|e| format!("Gagal menambah harga: {}", e))?;
    }

    Ok(Product {
        id: product_id,
        sku,
        product_name,
        category_id: cat_id,
        unit_id: u_id,
        description: description.trim().to_string(),
        status: "active".to_string(),
        created_at: now.clone(),
        updated_at: now,
        category_name: None,
        unit_name: None,
        variant_count: None,
    })
}

#[tauri::command]
fn update_product(
    state: State<AppState>,
    id: String,
    product_name: String,
    category_id: Option<String>,
    unit_id: Option<String>,
    description: String,
    status: String,
) -> Result<String, String> {
    let product_name = product_name.trim().to_string();
    if product_name.is_empty() {
        return Err("Nama produk harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    let cat_id = category_id.filter(|s| !s.is_empty());
    let u_id = unit_id.filter(|s| !s.is_empty());

    let affected = db
        .execute(
            "UPDATE products SET product_name = ?1, category_id = ?2, unit_id = ?3, description = ?4, status = ?5, updated_at = ?6 WHERE id = ?7 AND user_id = ?8",
            rusqlite::params![product_name, cat_id, u_id, description.trim(), status.trim(), now, id, user_id],
        )
        .map_err(|e| format!("Gagal mengupdate produk: {}", e))?;

    if affected == 0 {
        return Err("Produk tidak ditemukan".into());
    }

    Ok("Produk berhasil diupdate".into())
}

#[tauri::command]
fn delete_product(state: State<AppState>, id: String) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Delete variants first (cascade should handle this but be explicit)
    db.execute(
        "DELETE FROM product_variants WHERE product_id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| format!("Gagal menghapus variant: {}", e))?;

    let affected = db
        .execute("DELETE FROM products WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id])
        .map_err(|e| format!("Gagal menghapus produk: {}", e))?;

    if affected == 0 {
        return Err("Produk tidak ditemukan".into());
    }

    Ok("Produk berhasil dihapus".into())
}

// ─── Product Variant Commands ───────────────────────────────

#[tauri::command]
fn get_product_variants(
    state: State<AppState>,
    product_id: String,
) -> Result<Vec<ProductVariant>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, product_id, variant_name, sku, barcode, status, created_at, updated_at
             FROM product_variants WHERE product_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![product_id], |row| {
            Ok(ProductVariant {
                id: row.get(0)?,
                product_id: row.get(1)?,
                variant_name: row.get(2)?,
                sku: row.get(3)?,
                barcode: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut variants = Vec::new();
    for row in rows {
        variants.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(variants)
}

#[tauri::command]
fn add_product_variant(
    state: State<AppState>,
    product_id: String,
    variant_name: String,
    sku: String,
    barcode: String,
) -> Result<ProductVariant, String> {
    let variant_name = variant_name.trim().to_string();
    if variant_name.is_empty() {
        return Err("Nama variant harus diisi".into());
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = now_timestamp();

    db.execute(
        "INSERT INTO product_variants (id, product_id, variant_name, sku, barcode, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7)",
        rusqlite::params![id, product_id, variant_name, sku.trim(), barcode.trim(), now, now],
    )
    .map_err(|e| format!("Gagal menambah variant: {}", e))?;

    Ok(ProductVariant {
        id,
        product_id,
        variant_name,
        sku: sku.trim().to_string(),
        barcode: barcode.trim().to_string(),
        status: "active".to_string(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn update_product_variant(
    state: State<AppState>,
    id: String,
    variant_name: String,
    sku: String,
    barcode: String,
    status: String,
) -> Result<String, String> {
    let variant_name = variant_name.trim().to_string();
    if variant_name.is_empty() {
        return Err("Nama variant harus diisi".into());
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    let affected = db
        .execute(
            "UPDATE product_variants SET variant_name = ?1, sku = ?2, barcode = ?3, status = ?4, updated_at = ?5 WHERE id = ?6",
            rusqlite::params![variant_name, sku.trim(), barcode.trim(), status.trim(), now, id],
        )
        .map_err(|e| format!("Gagal mengupdate variant: {}", e))?;

    if affected == 0 {
        return Err("Variant tidak ditemukan".into());
    }

    Ok("Variant berhasil diupdate".into())
}

#[tauri::command]
fn delete_product_variant(state: State<AppState>, id: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let affected = db
        .execute(
            "DELETE FROM product_variants WHERE id = ?1",
            rusqlite::params![id],
        )
        .map_err(|e| format!("Gagal menghapus variant: {}", e))?;

    if affected == 0 {
        return Err("Variant tidak ditemukan".into());
    }

    Ok("Variant berhasil dihapus".into())
}

// ─── Inventory / Stock Commands ─────────────────────────────

#[tauri::command]
fn get_inventory_list(state: State<AppState>) -> Result<Vec<InventoryItem>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT pv.id, p.product_name, pv.variant_name, pv.sku,
                    COALESCE((SELECT SUM(im.quantity) FROM inventory_movements im WHERE im.variant_id = pv.id), 0) as quantity,
                    COALESCE(pp.price, 0) as price,
                    COALESCE(pp.cost, 0) as cost,
                    p.category_id
             FROM product_variants pv
             JOIN products p ON pv.product_id = p.id
             LEFT JOIN product_prices pp ON pp.variant_id = pv.id
             WHERE p.status = 'active' AND pv.status = 'active' AND p.user_id = ?1
             ORDER BY p.product_name, pv.variant_name",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(InventoryItem {
                variant_id: row.get(0)?,
                product_name: row.get(1)?,
                variant_name: row.get(2)?,
                sku: row.get(3)?,
                quantity: row.get(4)?,
                price: row.get(5)?,
                cost: row.get(6)?,
                category_id: row.get(7)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(items)
}

#[tauri::command]
fn get_inventory_movements(
    state: State<AppState>,
    variant_id: String,
) -> Result<Vec<InventoryMovement>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at
             FROM inventory_movements
             WHERE variant_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![variant_id], |row| {
            Ok(InventoryMovement {
                id: row.get(0)?,
                variant_id: row.get(1)?,
                movement_type: row.get(2)?,
                quantity: row.get(3)?,
                reference_type: row.get(4)?,
                reference_id: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(items)
}

// ─── Purchase Orders ────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PurchaseItemInput {
    pub variant_id: String,
    pub quantity_ordered: f64,
    pub unit_price: f64,
}

#[tauri::command]
fn get_purchase_orders(state: State<AppState>) -> Result<Vec<PurchaseOrder>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT po.id, po.order_number, po.supplier_id, s.supplier_name, po.status, po.total_amount, po.ordered_at, po.received_at, po.created_at
             FROM purchase_orders po
             LEFT JOIN suppliers s ON po.supplier_id = s.id
             WHERE po.user_id = ?1
             ORDER BY po.created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(PurchaseOrder {
                id: row.get(0)?,
                order_number: row.get(1)?,
                supplier_id: row.get(2)?,
                supplier_name: row.get(3)?,
                status: row.get(4)?,
                total_amount: row.get(5)?,
                ordered_at: row.get(6)?,
                received_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(items)
}

#[tauri::command]
fn get_purchase_order_items(
    state: State<AppState>,
    order_id: String,
) -> Result<Vec<PurchaseOrderItem>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT poi.id, poi.purchase_order_id, poi.variant_id,
                    poi.quantity_ordered, poi.quantity_received, poi.unit_price, poi.subtotal,
                    poi.created_at, p.product_name, pv.variant_name, pv.sku
             FROM purchase_order_items poi
             JOIN product_variants pv ON poi.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE poi.purchase_order_id = ?1",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![order_id], |row| {
            Ok(PurchaseOrderItem {
                id: row.get(0)?,
                purchase_order_id: row.get(1)?,
                variant_id: row.get(2)?,
                quantity_ordered: row.get(3)?,
                quantity_received: row.get(4)?,
                unit_price: row.get(5)?,
                subtotal: row.get(6)?,
                created_at: row.get(7)?,
                product_name: row.get(8)?,
                variant_name: row.get(9)?,
                sku: row.get(10)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(list)
}

#[tauri::command]
fn add_purchase_order(
    state: State<AppState>,
    supplier_id: Option<String>,
    items: Vec<PurchaseItemInput>,
) -> Result<PurchaseOrder, String> {
    if items.is_empty() {
        return Err("Minimal satu item harus diisi".into());
    }

    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    let order_id = Uuid::new_v4().to_string();

    // Generate order number PO-YYMMDD-XXXX
    let count: i64 = db
        .query_row("SELECT COUNT(*) FROM purchase_orders WHERE user_id = ?1", rusqlite::params![user_id], |row| row.get(0))
        .unwrap_or(0);
    let date_part = Local::now().format("%y%m%d").to_string();
    let order_number = format!("PO-{}-{:04}", date_part, count + 1);

    let mut total_amount = 0.0f64;
    for item in &items {
        total_amount += item.quantity_ordered * item.unit_price;
    }

    db.execute(
        "INSERT INTO purchase_orders (id, order_number, supplier_id, status, total_amount, ordered_at, created_at, user_id)
         VALUES (?1, ?2, ?3, 'ORDERED', ?4, ?5, ?6, ?7)",
        rusqlite::params![order_id, order_number, supplier_id, total_amount, now, now, user_id],
    )
    .map_err(|e| format!("Gagal membuat purchase order: {}", e))?;

    for item in &items {
        let item_id = Uuid::new_v4().to_string();
        let subtotal = item.quantity_ordered * item.unit_price;
        db.execute(
            "INSERT INTO purchase_order_items (id, purchase_order_id, variant_id, quantity_ordered, quantity_received, unit_price, subtotal, created_at)
             VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)",
            rusqlite::params![item_id, order_id, item.variant_id, item.quantity_ordered, item.unit_price, subtotal, now],
        )
        .map_err(|e| format!("Gagal menambah item PO: {}", e))?;
    }

    Ok(PurchaseOrder {
        id: order_id,
        order_number,
        supplier_id: supplier_id.clone(),
        supplier_name: None,
        status: "ORDERED".into(),
        total_amount,
        ordered_at: now.clone(),
        received_at: None,
        created_at: now,
    })
}

#[tauri::command]
fn receive_purchase_order(
    state: State<AppState>,
    order_id: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    // Check status
    let status: String = db
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1",
            rusqlite::params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order tidak ditemukan".to_string())?;

    if status == "RECEIVED" {
        return Err("Purchase order sudah diterima".into());
    }

    // Get all items
    let mut stmt = db
        .prepare("SELECT id, variant_id, quantity_ordered FROM purchase_order_items WHERE purchase_order_id = ?1")
        .map_err(|e| format!("Query error: {}", e))?;

    let items: Vec<(String, String, f64)> = stmt
        .query_map(rusqlite::params![order_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    for (item_id, variant_id, qty) in &items {
        // Update quantity_received
        db.execute(
            "UPDATE purchase_order_items SET quantity_received = quantity_ordered WHERE id = ?1",
            rusqlite::params![item_id],
        )
        .map_err(|e| format!("Gagal update item: {}", e))?;


        // Create movement record
        db.execute(
            "INSERT INTO inventory_movements (id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
             VALUES (?1, ?2, 'PURCHASE', ?3, 'PURCHASE_ORDER', ?4, ?5, ?6)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                variant_id,
                qty,
                order_id,
                format!("Penerimaan PO"),
                now
            ],
        )
        .map_err(|e| format!("Gagal mencatat movement: {}", e))?;
    }

    // Update order status
    db.execute(
        "UPDATE purchase_orders SET status = 'RECEIVED', received_at = ?1 WHERE id = ?2",
        rusqlite::params![now, order_id],
    )
    .map_err(|e| format!("Gagal update status PO: {}", e))?;

    Ok("Purchase order berhasil diterima".into())
}

// ─── Stock Opname (Adjustments) ─────────────────────────────

#[tauri::command]
fn get_adjustments(state: State<AppState>) -> Result<Vec<InventoryAdjustment>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT ia.id, ia.variant_id, ia.old_quantity, ia.new_quantity, ia.difference,
                    ia.reason, ia.adjusted_by, ia.created_at,
                    p.product_name, pv.variant_name, pv.sku
             FROM inventory_adjustments ia
             JOIN product_variants pv ON ia.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE p.user_id = ?1
             ORDER BY ia.created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(InventoryAdjustment {
                id: row.get(0)?,
                variant_id: row.get(1)?,
                old_quantity: row.get(2)?,
                new_quantity: row.get(3)?,
                difference: row.get(4)?,
                reason: row.get(5)?,
                adjusted_by: row.get(6)?,
                created_at: row.get(7)?,
                product_name: row.get(8)?,
                variant_name: row.get(9)?,
                sku: row.get(10)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(items)
}

#[tauri::command]
fn add_adjustment(
    state: State<AppState>,
    variant_id: String,
    new_quantity: f64,
    reason: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    // Get old quantity
    let old_qty: f64 = db
        .query_row(
            "SELECT COALESCE((SELECT SUM(quantity) FROM inventory_movements WHERE variant_id = ?1), 0)",
            rusqlite::params![variant_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let difference = new_quantity - old_qty;
    let adjustment_id = Uuid::new_v4().to_string();

    // Record adjustment
    db.execute(
        "INSERT INTO inventory_adjustments (id, variant_id, old_quantity, new_quantity, difference, reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![adjustment_id, variant_id, old_qty, new_quantity, difference, reason.trim(), now],
    )
    .map_err(|e| format!("Gagal mencatat adjustment: {}", e))?;


    // Movement record
    db.execute(
        "INSERT INTO inventory_movements (id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
         VALUES (?1, ?2, 'ADJUSTMENT', ?3, 'ADJUSTMENT', ?4, ?5, ?6)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            variant_id,
            difference,
            adjustment_id,
            format!("Stock opname: {}", reason.trim()),
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat movement: {}", e))?;

    Ok("Stock opname berhasil".into())
}

// ─── Inventory Waste ────────────────────────────────────────

#[tauri::command]
fn get_waste(state: State<AppState>) -> Result<Vec<InventoryWaste>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT iw.id, iw.variant_id, iw.quantity, iw.waste_type, iw.reason,
                    iw.reported_by, iw.created_at,
                    p.product_name, pv.variant_name, pv.sku
             FROM inventory_waste iw
             JOIN product_variants pv ON iw.variant_id = pv.id
             JOIN products p ON pv.product_id = p.id
             WHERE p.user_id = ?1
             ORDER BY iw.created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(InventoryWaste {
                id: row.get(0)?,
                variant_id: row.get(1)?,
                quantity: row.get(2)?,
                waste_type: row.get(3)?,
                reason: row.get(4)?,
                reported_by: row.get(5)?,
                created_at: row.get(6)?,
                product_name: row.get(7)?,
                variant_name: row.get(8)?,
                sku: row.get(9)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("Row error: {}", e))?);
    }
    Ok(items)
}

#[tauri::command]
fn add_waste(
    state: State<AppState>,
    variant_id: String,
    quantity: f64,
    waste_type: String,
    reason: String,
) -> Result<String, String> {
    if quantity <= 0.0 {
        return Err("Jumlah harus lebih dari 0".into());
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    let waste_id = Uuid::new_v4().to_string();

    db.execute(
        "INSERT INTO inventory_waste (id, variant_id, quantity, waste_type, reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![waste_id, variant_id, quantity, waste_type.trim(), reason.trim(), now],
    )
    .map_err(|e| format!("Gagal mencatat waste: {}", e))?;


    // Movement record
    db.execute(
        "INSERT INTO inventory_movements (id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
         VALUES (?1, ?2, 'WASTE', ?3, 'WASTE', ?4, ?5, ?6)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            variant_id,
            -quantity,
            waste_id,
            format!("{}: {}", waste_type.trim(), reason.trim()),
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat movement: {}", e))?;

    Ok("Stok terbuang berhasil dicatat".into())
}

// ─── Returns ────────────────────────────────────────────────

#[tauri::command]
fn add_return(
    state: State<AppState>,
    variant_id: String,
    quantity: f64,
    reason: String,
) -> Result<String, String> {
    if quantity <= 0.0 {
        return Err("Jumlah harus lebih dari 0".into());
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    let return_id = Uuid::new_v4().to_string();


    // Movement record
    db.execute(
        "INSERT INTO inventory_movements (id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
         VALUES (?1, ?2, 'RETURN', ?3, 'RETURN', ?4, ?5, ?6)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            variant_id,
            -quantity,
            return_id,
            format!("Retur: {}", reason.trim()),
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat movement: {}", e))?;

    Ok("Retur berhasil dicatat".into())
}

// ─── Payment Methods ────────────────────────────────────────

#[tauri::command]
fn get_payment_methods(state: State<AppState>) -> Result<Vec<PaymentMethod>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare("SELECT id, method_name, type, status, created_at FROM payment_methods WHERE user_id = ?1 ORDER BY method_name ASC")
        .map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(PaymentMethod {
            id: row.get(0)?,
            method_name: row.get(1)?,
            method_type: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows { list.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(list)
}

#[tauri::command]
fn add_payment_method(state: State<AppState>, payload: PaymentMethod) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    db.execute(
        "INSERT INTO payment_methods (id, method_name, type, status, created_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![Uuid::new_v4().to_string(), payload.method_name, payload.method_type, payload.status, now, user_id],
    ).map_err(|e| format!("Gagal tambah payment method: {}", e))?;
    Ok("Metode pembayaran berhasil ditambahkan".into())
}

#[tauri::command]
fn update_payment_method(state: State<AppState>, payload: PaymentMethod) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db.execute(
        "UPDATE payment_methods SET method_name = ?1, type = ?2, status = ?3 WHERE id = ?4 AND user_id = ?5",
        rusqlite::params![payload.method_name, payload.method_type, payload.status, payload.id, user_id],
    ).map_err(|e| format!("Gagal update payment method: {}", e))?;
    Ok("Metode pembayaran berhasil diupdate".into())
}

#[tauri::command]
fn delete_payment_method(state: State<AppState>, id: String) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db.execute("DELETE FROM payment_methods WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id])
        .map_err(|e| format!("Gagal hapus payment method: {}", e))?;
    Ok("Metode pembayaran berhasil dihapus".into())
}

// ─── Taxes ──────────────────────────────────────────────────

#[tauri::command]
fn get_taxes(state: State<AppState>) -> Result<Vec<Tax>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare("SELECT id, tax_name, tax_rate, tax_type, status, created_at FROM taxes WHERE user_id = ?1 ORDER BY tax_name ASC")
        .map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(Tax {
            id: row.get(0)?,
            tax_name: row.get(1)?,
            tax_rate: row.get(2)?,
            tax_type: row.get(3)?,
            status: row.get(4)?,
            created_at: row.get(5)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows { list.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(list)
}

#[tauri::command]
fn add_tax(state: State<AppState>, payload: Tax) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    db.execute(
        "INSERT INTO taxes (id, tax_name, tax_rate, tax_type, status, created_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![Uuid::new_v4().to_string(), payload.tax_name, payload.tax_rate, payload.tax_type, payload.status, now, user_id],
    ).map_err(|e| format!("Gagal tambah tax: {}", e))?;
    Ok("Pajak berhasil ditambahkan".into())
}

#[tauri::command]
fn update_tax(state: State<AppState>, payload: Tax) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db.execute(
        "UPDATE taxes SET tax_name = ?1, tax_rate = ?2, tax_type = ?3, status = ?4 WHERE id = ?5 AND user_id = ?6",
        rusqlite::params![payload.tax_name, payload.tax_rate, payload.tax_type, payload.status, payload.id, user_id],
    ).map_err(|e| format!("Gagal update tax: {}", e))?;
    Ok("Pajak berhasil diupdate".into())
}

#[tauri::command]
fn delete_tax(state: State<AppState>, id: String) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db.execute("DELETE FROM taxes WHERE id = ?1 AND user_id = ?2", rusqlite::params![id, user_id])
        .map_err(|e| format!("Gagal hapus tax: {}", e))?;
    Ok("Pajak berhasil dihapus".into())
}

// ─── Transaction Commands ───────────────────────────────────

#[tauri::command]
fn create_transaction(
    state: State<AppState>,
    cashier_id: i64,
    items: Vec<CartItemInput>,
) -> Result<Transaction, String> {
    if items.is_empty() {
        return Err("Minimal satu item harus ditambahkan".into());
    }
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    let tx_id = Uuid::new_v4().to_string();

    // Generate invoice INV-YYMMDD-XXXX
    let count: i64 = db.query_row("SELECT COUNT(*) FROM transactions WHERE user_id = ?1", rusqlite::params![user_id], |row| row.get(0)).unwrap_or(0);
    let date_part = Local::now().format("%y%m%d").to_string();
    let invoice_number = format!("INV-{}-{:04}", date_part, count + 1);

    // Calculate subtotal from items
    let mut subtotal = 0.0f64;
    for item in &items {
        let item_subtotal = (item.price * item.quantity) - item.discount;
        subtotal += item_subtotal;
    }

    // Get active taxes and calculate
    let mut tax_total = 0.0f64;
    let mut active_taxes: Vec<(String, f64, String)> = Vec::new();
    {
        let mut tax_stmt = db.prepare("SELECT tax_name, tax_rate, tax_type FROM taxes WHERE status = 'active' AND user_id = ?1")
            .map_err(|e| format!("Query error: {}", e))?;
        let tax_rows = tax_stmt.query_map(rusqlite::params![user_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| format!("Query error: {}", e))?;
        for row in tax_rows {
            let (name, rate, ttype) = row.map_err(|e| format!("Row error: {}", e))?;
            active_taxes.push((name, rate, ttype));
        }
    }

    for (_, rate, ttype) in &active_taxes {
        if ttype == "PERCENTAGE" {
            tax_total += subtotal * rate / 100.0;
        } else {
            tax_total += rate;
        }
    }

    let grand_total = subtotal + tax_total;

    // Insert transaction
    db.execute(
        "INSERT INTO transactions (id, invoice_number, cashier_id, subtotal, discount_total, tax_total, grand_total, status, created_at, updated_at, user_id)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, 'OPEN', ?7, ?8, ?9)",
        rusqlite::params![tx_id, invoice_number, cashier_id, subtotal, tax_total, grand_total, now, now, user_id],
    ).map_err(|e| format!("Gagal membuat transaksi: {}", e))?;

    // Insert items
    for item in &items {
        let item_subtotal = (item.price * item.quantity) - item.discount;
        db.execute(
            "INSERT INTO transaction_items (id, transaction_id, variant_id, price, quantity, discount, tax, subtotal, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
            rusqlite::params![Uuid::new_v4().to_string(), tx_id, item.variant_id, item.price, item.quantity, item.discount, item_subtotal, now],
        ).map_err(|e| format!("Gagal menambah item transaksi: {}", e))?;
    }

    // Insert tax records
    for (name, rate, ttype) in &active_taxes {
        let tax_amount = if ttype == "PERCENTAGE" { subtotal * rate / 100.0 } else { *rate };
        db.execute(
            "INSERT INTO transaction_taxes (id, transaction_id, tax_name, tax_rate, tax_amount, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![Uuid::new_v4().to_string(), tx_id, name, rate, tax_amount, now],
        ).map_err(|e| format!("Gagal menambah tax transaksi: {}", e))?;
    }

    Ok(Transaction {
        id: tx_id,
        invoice_number,
        subtotal,
        discount_total: 0.0,
        tax_total,
        grand_total,
        status: "OPEN".into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn hold_transaction(state: State<AppState>, transaction_id: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    db.execute(
        "UPDATE transactions SET status = 'HOLD', updated_at = ?1 WHERE id = ?2 AND status = 'OPEN'",
        rusqlite::params![now, transaction_id],
    ).map_err(|e| format!("Gagal hold transaksi: {}", e))?;
    Ok("Transaksi berhasil di-hold".into())
}

#[tauri::command]
fn update_transaction_items(
    state: State<AppState>,
    transaction_id: String,
    items: Vec<CartItemInput>,
) -> Result<String, String> {
    if items.is_empty() {
        return Err("Minimal satu item harus ditambahkan".into());
    }
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    // Verify transaction exists and is OPEN or HOLD
    let status: String = db.query_row(
        "SELECT status FROM transactions WHERE id = ?1",
        rusqlite::params![transaction_id],
        |row| row.get(0),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    if status != "OPEN" && status != "HOLD" {
        return Err(format!("Transaksi tidak bisa diubah (status: {})", status));
    }

    // Delete existing items and taxes
    db.execute(
        "DELETE FROM transaction_items WHERE transaction_id = ?1",
        rusqlite::params![transaction_id],
    ).map_err(|e| format!("Gagal hapus item lama: {}", e))?;

    db.execute(
        "DELETE FROM transaction_taxes WHERE transaction_id = ?1",
        rusqlite::params![transaction_id],
    ).map_err(|e| format!("Gagal hapus tax lama: {}", e))?;

    // Calculate new subtotal
    let mut subtotal = 0.0f64;
    for item in &items {
        let item_subtotal = (item.price * item.quantity) - item.discount;
        subtotal += item_subtotal;
    }

    // Get active taxes and calculate
    let mut tax_total = 0.0f64;
    let mut active_taxes: Vec<(String, f64, String)> = Vec::new();
    {
        let user_id_for_tax = get_current_user_id(&state)?;
        let mut tax_stmt = db.prepare("SELECT tax_name, tax_rate, tax_type FROM taxes WHERE status = 'active' AND user_id = ?1")
            .map_err(|e| format!("Query error: {}", e))?;
        let tax_rows = tax_stmt.query_map(rusqlite::params![user_id_for_tax], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| format!("Query error: {}", e))?;
        for row in tax_rows {
            let (name, rate, ttype) = row.map_err(|e| format!("Row error: {}", e))?;
            active_taxes.push((name, rate, ttype));
        }
    }

    for (_, rate, ttype) in &active_taxes {
        if ttype == "PERCENTAGE" {
            tax_total += subtotal * rate / 100.0;
        } else {
            tax_total += rate;
        }
    }

    let grand_total = subtotal + tax_total;

    // Re-insert items
    for item in &items {
        let item_subtotal = (item.price * item.quantity) - item.discount;
        db.execute(
            "INSERT INTO transaction_items (id, transaction_id, variant_id, price, quantity, discount, tax, subtotal, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
            rusqlite::params![Uuid::new_v4().to_string(), transaction_id, item.variant_id, item.price, item.quantity, item.discount, item_subtotal, now],
        ).map_err(|e| format!("Gagal menambah item transaksi: {}", e))?;
    }

    // Re-insert tax records
    for (name, rate, ttype) in &active_taxes {
        let tax_amount = if ttype == "PERCENTAGE" { subtotal * rate / 100.0 } else { *rate };
        db.execute(
            "INSERT INTO transaction_taxes (id, transaction_id, tax_name, tax_rate, tax_amount, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![Uuid::new_v4().to_string(), transaction_id, name, rate, tax_amount, now],
        ).map_err(|e| format!("Gagal menambah tax transaksi: {}", e))?;
    }

    // Update transaction totals and set status to OPEN
    db.execute(
        "UPDATE transactions SET subtotal = ?1, tax_total = ?2, grand_total = ?3, status = 'OPEN', updated_at = ?4 WHERE id = ?5",
        rusqlite::params![subtotal, tax_total, grand_total, now, transaction_id],
    ).map_err(|e| format!("Gagal update transaksi: {}", e))?;

    Ok("Transaksi berhasil diupdate".into())
}

#[tauri::command]
fn get_hold_transactions(state: State<AppState>) -> Result<Vec<Transaction>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare(
        "SELECT id, invoice_number, subtotal, discount_total, tax_total, grand_total, status, created_at, updated_at
         FROM transactions WHERE status = 'HOLD' AND user_id = ?1 ORDER BY updated_at DESC"
    ).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            subtotal: row.get(2)?,
            discount_total: row.get(3)?,
            tax_total: row.get(4)?,
            grand_total: row.get(5)?,
            status: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows { list.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(list)
}

#[tauri::command]
fn get_transaction_items(state: State<AppState>, transaction_id: String) -> Result<Vec<TransactionItem>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare(
        "SELECT ti.id, ti.variant_id, ti.price, ti.quantity, ti.discount, ti.tax, ti.subtotal,
                p.product_name, pv.variant_name, pv.sku
         FROM transaction_items ti
         JOIN product_variants pv ON ti.variant_id = pv.id
         JOIN products p ON pv.product_id = p.id
         WHERE ti.transaction_id = ?1"
    ).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![transaction_id], |row| {
        Ok(TransactionItem {
            id: row.get(0)?,
            variant_id: row.get(1)?,
            price: row.get(2)?,
            quantity: row.get(3)?,
            discount: row.get(4)?,
            tax: row.get(5)?,
            subtotal: row.get(6)?,
            product_name: row.get(7)?,
            variant_name: row.get(8)?,
            sku: row.get(9)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows { list.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(list)
}

#[tauri::command]
fn get_transaction_payments(state: State<AppState>, transaction_id: String) -> Result<Vec<TransactionPayment>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare(
        "SELECT tp.id, pm.method_name, tp.amount, tp.reference_number, tp.paid_at
         FROM transaction_payments tp
         LEFT JOIN payment_methods pm ON tp.payment_method_id = pm.id
         WHERE tp.transaction_id = ?1"
    ).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![transaction_id], |row| {
        Ok(TransactionPayment {
            id: row.get(0)?,
            method_name: row.get(1)?,
            amount: row.get(2)?,
            reference_number: row.get(3)?,
            paid_at: row.get(4)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows { list.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(list)
}

#[tauri::command]
fn pay_transaction(
    state: State<AppState>,
    transaction_id: String,
    payment_method_id: String,
    amount: f64,
    reference_number: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    // Verify transaction exists and is OPEN or HOLD
    let status: String = db.query_row(
        "SELECT status FROM transactions WHERE id = ?1",
        rusqlite::params![transaction_id],
        |row| row.get(0),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    if status != "OPEN" && status != "HOLD" {
        return Err(format!("Transaksi tidak bisa dibayar (status: {})", status));
    }

    // Update transaction status
    db.execute(
        "UPDATE transactions SET status = 'PAID', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, transaction_id],
    ).map_err(|e| format!("Gagal update transaksi: {}", e))?;

    // Insert payment record
    db.execute(
        "INSERT INTO transaction_payments (id, transaction_id, payment_method_id, amount, reference_number, paid_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![Uuid::new_v4().to_string(), transaction_id, payment_method_id, amount, reference_number, now, now],
    ).map_err(|e| format!("Gagal mencatat pembayaran: {}", e))?;

    // Deduct inventory for each item (SALE movement)
    let mut item_stmt = db.prepare(
        "SELECT variant_id, quantity FROM transaction_items WHERE transaction_id = ?1"
    ).map_err(|e| format!("Query error: {}", e))?;

    let items: Vec<(String, f64)> = item_stmt.query_map(
        rusqlite::params![transaction_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?)),
    ).map_err(|e| format!("Query error: {}", e))?
     .filter_map(|r| r.ok())
     .collect();

    for (variant_id, quantity) in items {

        // Movement record
        db.execute(
            "INSERT INTO inventory_movements (id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
             VALUES (?1, ?2, 'SALE', ?3, 'TRANSACTION', ?4, 'Penjualan', ?5)",
            rusqlite::params![Uuid::new_v4().to_string(), variant_id, -quantity, transaction_id, now],
        ).map_err(|e| format!("Gagal mencatat movement: {}", e))?;
    }

    Ok("Pembayaran berhasil".into())
}

#[tauri::command]
fn cancel_transaction(state: State<AppState>, transaction_id: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();
    db.execute(
        "UPDATE transactions SET status = 'CANCELLED', updated_at = ?1 WHERE id = ?2 AND (status = 'OPEN' OR status = 'HOLD')",
        rusqlite::params![now, transaction_id],
    ).map_err(|e| format!("Gagal batalkan transaksi: {}", e))?;
    Ok("Transaksi berhasil dibatalkan".into())
}

#[tauri::command]
fn get_transaction_history(state: State<AppState>) -> Result<Vec<Transaction>, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db.prepare(
        "SELECT id, invoice_number, subtotal, discount_total, tax_total, grand_total, status, created_at, updated_at
         FROM transactions WHERE user_id = ?1 ORDER BY created_at DESC"
    ).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            invoice_number: row.get(1)?,
            subtotal: row.get(2)?,
            discount_total: row.get(3)?,
            tax_total: row.get(4)?,
            grand_total: row.get(5)?,
            status: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| format!("Query error: {}", e))?;
    let mut list = Vec::new();
    for row in rows { list.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(list)
}

#[tauri::command]
fn refund_transaction(state: State<AppState>, transaction_id: String, refund_reason: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    // Verify it's PAID
    let (status, grand_total): (String, f64) = db.query_row(
        "SELECT status, grand_total FROM transactions WHERE id = ?1",
        rusqlite::params![transaction_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| "Transaksi tidak ditemukan".to_string())?;

    if status != "PAID" {
        return Err("Hanya transaksi PAID yang bisa di-refund".into());
    }

    // Update status
    db.execute(
        "UPDATE transactions SET status = 'REFUNDED', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, transaction_id],
    ).map_err(|e| format!("Gagal update transaksi: {}", e))?;

    // Insert refund record
    db.execute(
        "INSERT INTO transaction_refunds (id, transaction_id, refund_reason, refund_amount, refunded_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![Uuid::new_v4().to_string(), transaction_id, refund_reason, grand_total, now],
    ).map_err(|e| format!("Gagal mencatat refund: {}", e))?;

    // Restore inventory
    let mut item_stmt = db.prepare(
        "SELECT variant_id, quantity FROM transaction_items WHERE transaction_id = ?1"
    ).map_err(|e| format!("Query error: {}", e))?;

    let items: Vec<(String, f64)> = item_stmt.query_map(
        rusqlite::params![transaction_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?)),
    ).map_err(|e| format!("Query error: {}", e))?
     .filter_map(|r| r.ok())
     .collect();

    for (variant_id, quantity) in items {

        // Movement record (positive = stock restored)
        db.execute(
            "INSERT INTO inventory_movements (id, variant_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
             VALUES (?1, ?2, 'RETURN', ?3, 'REFUND', ?4, ?5, ?6)",
            rusqlite::params![Uuid::new_v4().to_string(), variant_id, quantity, transaction_id, format!("Refund: {}", refund_reason), now],
        ).map_err(|e| format!("Gagal mencatat movement: {}", e))?;
    }

    Ok("Refund berhasil".into())
}

// ─── Report Commands ────────────────────────────────────────

#[tauri::command]
fn get_sales_report(
    state: State<AppState>,
    period: String,   // "daily", "monthly", "yearly"
    date: String,     // "2026-03-18", "2026-03", "2026"
) -> Result<serde_json::Value, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Build date filter
    let (date_filter, group_format, label_format) = match period.as_str() {
        "daily" => (
            format!("DATE(t.created_at) = '{}'", date),
            "strftime('%H', t.created_at)",
            "strftime('%H:00', t.created_at)",
        ),
        "monthly" => (
            format!("strftime('%Y-%m', t.created_at) = '{}'", date),
            "strftime('%d', t.created_at)",
            "strftime('%d', t.created_at)",
        ),
        "yearly" => (
            format!("strftime('%Y', t.created_at) = '{}'", date),
            "strftime('%m', t.created_at)",
            "strftime('%m', t.created_at)",
        ),
        _ => return Err("Period harus daily, monthly, atau yearly".into()),
    };

    // Summary
    let summary_sql = format!(
        "SELECT COUNT(*), COALESCE(SUM(grand_total), 0), COALESCE(SUM(tax_total), 0)
         FROM transactions t WHERE t.status = 'PAID' AND t.user_id = {} AND {}",
        user_id, date_filter
    );
    let (total_tx, total_revenue, total_tax): (i64, f64, f64) = db.query_row(
        &summary_sql, [],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).unwrap_or((0, 0.0, 0.0));

    // Total items sold
    let items_sql = format!(
        "SELECT COALESCE(SUM(ti.quantity), 0)
         FROM transaction_items ti
         JOIN transactions t ON ti.transaction_id = t.id
         WHERE t.status = 'PAID' AND t.user_id = {} AND {}",
        user_id, date_filter
    );
    let total_items: f64 = db.query_row(&items_sql, [], |row| row.get(0)).unwrap_or(0.0);

    // Estimated profit (revenue - cost)
    let profit_sql = format!(
        "SELECT COALESCE(SUM(ti.subtotal - (COALESCE(pp.cost, 0) * ti.quantity)), 0)
         FROM transaction_items ti
         JOIN transactions t ON ti.transaction_id = t.id
         LEFT JOIN product_prices pp ON pp.variant_id = ti.variant_id
         WHERE t.status = 'PAID' AND t.user_id = {} AND {}",
        user_id, date_filter
    );
    let est_profit: f64 = db.query_row(&profit_sql, [], |row| row.get(0)).unwrap_or(0.0);

    // Chart data
    let chart_sql = format!(
        "SELECT {label} as label, COALESCE(SUM(t.grand_total), 0) as total
         FROM transactions t
         WHERE t.status = 'PAID' AND t.user_id = {uid} AND {filter}
         GROUP BY {group}
         ORDER BY {group} ASC",
        label = label_format, uid = user_id, filter = date_filter, group = group_format
    );
    let mut chart_stmt = db.prepare(&chart_sql).map_err(|e| format!("Query error: {}", e))?;
    let chart_rows = chart_stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    }).map_err(|e| format!("Query error: {}", e))?;

    let mut chart_labels: Vec<String> = Vec::new();
    let mut chart_values: Vec<f64> = Vec::new();
    for row in chart_rows {
        let (label, value) = row.map_err(|e| format!("Row error: {}", e))?;
        chart_labels.push(label);
        chart_values.push(value);
    }

    Ok(serde_json::json!({
        "total_transactions": total_tx,
        "total_revenue": total_revenue,
        "total_tax": total_tax,
        "total_items_sold": total_items,
        "estimated_profit": est_profit,
        "chart_labels": chart_labels,
        "chart_values": chart_values,
    }))
}

#[tauri::command]
fn get_sales_per_product(
    state: State<AppState>,
    period: String,
    date: String,
) -> Result<serde_json::Value, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let date_filter = match period.as_str() {
        "daily" => format!("DATE(t.created_at) = '{}'", date),
        "monthly" => format!("strftime('%Y-%m', t.created_at) = '{}'", date),
        "yearly" => format!("strftime('%Y', t.created_at) = '{}'", date),
        _ => return Err("Period harus daily, monthly, atau yearly".into()),
    };

    let sql = format!(
        "SELECT pv.id, p.product_name, pv.variant_name, pv.sku,
                SUM(ti.quantity) as qty_sold,
                SUM(ti.subtotal) as total_revenue
         FROM transaction_items ti
         JOIN transactions t ON ti.transaction_id = t.id
         JOIN product_variants pv ON ti.variant_id = pv.id
         JOIN products p ON pv.product_id = p.id
         WHERE t.status = 'PAID' AND t.user_id = {} AND {}
         GROUP BY pv.id
         ORDER BY qty_sold DESC",
        user_id, date_filter
    );

    let mut stmt = db.prepare(&sql).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "variant_id": row.get::<_, String>(0)?,
            "product_name": row.get::<_, String>(1)?,
            "variant_name": row.get::<_, String>(2)?,
            "sku": row.get::<_, String>(3)?,
            "qty_sold": row.get::<_, f64>(4)?,
            "total_revenue": row.get::<_, f64>(5)?,
        }))
    }).map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows { items.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(serde_json::json!(items))
}

#[tauri::command]
fn get_product_sales_history(
    state: State<AppState>,
    variant_id: String,
    period: String,
    date: String,
) -> Result<serde_json::Value, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let date_filter = match period.as_str() {
        "daily" => format!("DATE(t.created_at) = '{}'", date),
        "monthly" => format!("strftime('%Y-%m', t.created_at) = '{}'", date),
        "yearly" => format!("strftime('%Y', t.created_at) = '{}'", date),
        _ => return Err("Period harus daily, monthly, atau yearly".into()),
    };

    let sql = format!(
        "SELECT t.invoice_number, ti.quantity, ti.price, ti.subtotal, t.created_at
         FROM transaction_items ti
         JOIN transactions t ON ti.transaction_id = t.id
         WHERE t.status = 'PAID' AND ti.variant_id = ?1 AND t.user_id = {} AND {}
         ORDER BY t.created_at DESC",
        user_id, date_filter
    );

    let mut stmt = db.prepare(&sql).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![variant_id], |row| {
        Ok(serde_json::json!({
            "invoice_number": row.get::<_, String>(0)?,
            "quantity": row.get::<_, f64>(1)?,
            "price": row.get::<_, f64>(2)?,
            "subtotal": row.get::<_, f64>(3)?,
            "created_at": row.get::<_, String>(4)?,
        }))
    }).map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows { items.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(serde_json::json!(items))
}

#[tauri::command]
fn get_sales_per_method(
    state: State<AppState>,
    period: String,
    date: String,
) -> Result<serde_json::Value, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let date_filter = match period.as_str() {
        "daily" => format!("DATE(t.created_at) = '{}'", date),
        "monthly" => format!("strftime('%Y-%m', t.created_at) = '{}'", date),
        "yearly" => format!("strftime('%Y', t.created_at) = '{}'", date),
        _ => return Err("Period harus daily, monthly, atau yearly".into()),
    };

    let sql = format!(
        "SELECT pm.id, pm.method_name, pm.type,
                COUNT(tp.id) as total_tx,
                COALESCE(SUM(tp.amount), 0) as total_amount
         FROM transaction_payments tp
         JOIN payment_methods pm ON tp.payment_method_id = pm.id
         JOIN transactions t ON tp.transaction_id = t.id
         WHERE t.status = 'PAID' AND t.user_id = {} AND {}
         GROUP BY pm.id
         ORDER BY total_amount DESC",
        user_id, date_filter
    );

    let mut stmt = db.prepare(&sql).map_err(|e| format!("Query error: {}", e))?;
    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "method_id": row.get::<_, String>(0)?,
            "method_name": row.get::<_, String>(1)?,
            "method_type": row.get::<_, String>(2)?,
            "total_transactions": row.get::<_, i64>(3)?,
            "total_amount": row.get::<_, f64>(4)?,
        }))
    }).map_err(|e| format!("Query error: {}", e))?;

    let mut items = Vec::new();
    for row in rows { items.push(row.map_err(|e| format!("Row error: {}", e))?); }
    Ok(serde_json::json!(items))
}
// ─── User Account Commands ──────────────────────────────────

#[tauri::command]
fn get_user_account(state: State<AppState>) -> Result<UserAccount, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.query_row(
        "SELECT id, nama, username, email, phone FROM users WHERE id = ?1",
        rusqlite::params![user_id],
        |row| {
            Ok(UserAccount {
                id: row.get(0)?,
                nama: row.get(1)?,
                username: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
            })
        },
    )
    .map_err(|e| format!("Gagal mengambil data akun: {}", e))
}

#[tauri::command]
fn update_user_account(
    state: State<AppState>,
    nama: String,
    username: String,
    email: String,
    phone: String,
    old_password: Option<String>,
    new_password: Option<String>,
) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let nama = nama.trim().to_string();
    let username = username.trim().to_string();
    let email = email.trim().to_string();
    let phone = phone.trim().to_string();

    if nama.is_empty() || username.is_empty() {
        return Err("Nama dan username harus diisi".into());
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Check username uniqueness (exclude current user)
    let existing: Result<i64, _> = db.query_row(
        "SELECT id FROM users WHERE username = ?1 AND id != ?2",
        rusqlite::params![username, user_id],
        |row| row.get(0),
    );
    if existing.is_ok() {
        return Err("Username sudah digunakan oleh pengguna lain".into());
    }

    // Handle password change if requested
    if let (Some(old_pw), Some(new_pw)) = (&old_password, &new_password) {
        if new_pw.len() < 6 {
            return Err("Password baru minimal 6 karakter".into());
        }

        let current_hash: String = db
            .query_row(
                "SELECT password_hash FROM users WHERE id = ?1",
                rusqlite::params![user_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Query error: {}", e))?;

        let is_valid = verify(old_pw, &current_hash)
            .map_err(|e| format!("Verify error: {}", e))?;

        if !is_valid {
            return Err("Password lama salah".into());
        }

        let new_hash = hash(new_pw, DEFAULT_COST)
            .map_err(|e| format!("Hash error: {}", e))?;

        db.execute(
            "UPDATE users SET nama = ?1, username = ?2, email = ?3, phone = ?4, password_hash = ?5 WHERE id = ?6",
            rusqlite::params![nama, username, email, phone, new_hash, user_id],
        )
        .map_err(|e| format!("Gagal update akun: {}", e))?;
    } else {
        db.execute(
            "UPDATE users SET nama = ?1, username = ?2, email = ?3, phone = ?4 WHERE id = ?5",
            rusqlite::params![nama, username, email, phone, user_id],
        )
        .map_err(|e| format!("Gagal update akun: {}", e))?;
    }

    // Update session data
    let mut current_user = state
        .current_user
        .lock()
        .map_err(|e| format!("Session error: {}", e))?;
    *current_user = Some(UserInfo {
        id: user_id,
        nama: nama.clone(),
        username: username.clone(),
    });

    Ok("Akun berhasil diperbarui".into())
}

// ─── Business Profile Commands ──────────────────────────────

#[tauri::command]
fn get_business_profile(state: State<AppState>) -> Result<BusinessProfile, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let result = db.query_row(
        "SELECT id, business_name, contact_number, email, business_category, address, logo_base64, created_at, updated_at FROM business_profiles WHERE user_id = ?1",
        rusqlite::params![user_id],
        |row| {
            Ok(BusinessProfile {
                id: row.get(0)?,
                business_name: row.get(1)?,
                contact_number: row.get(2)?,
                email: row.get(3)?,
                business_category: row.get(4)?,
                address: row.get(5)?,
                logo_base64: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    );

    match result {
        Ok(profile) => Ok(profile),
        Err(_) => {
            // Create default empty profile for this user
            let id = Uuid::new_v4().to_string();
            let now = now_timestamp();
            db.execute(
                "INSERT INTO business_profiles (id, user_id, business_name, contact_number, email, business_category, address, logo_base64, created_at, updated_at) VALUES (?1, ?2, '', '', '', '', '', '', ?3, ?4)",
                rusqlite::params![id, user_id, now, now],
            ).map_err(|e| format!("Gagal membuat profil: {}", e))?;
            Ok(BusinessProfile {
                id,
                business_name: String::new(),
                contact_number: String::new(),
                email: String::new(),
                business_category: String::new(),
                address: String::new(),
                logo_base64: String::new(),
                created_at: now.clone(),
                updated_at: now,
            })
        }
    }
}

#[tauri::command]
fn save_business_profile(state: State<AppState>, payload: BusinessProfile) -> Result<String, String> {
    let user_id = get_current_user_id(&state)?;
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = now_timestamp();

    db.execute(
        "INSERT OR REPLACE INTO business_profiles (id, user_id, business_name, contact_number, email, business_category, address, logo_base64, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, COALESCE((SELECT created_at FROM business_profiles WHERE user_id = ?2), ?9), ?10)",
        rusqlite::params![
            payload.id,
            user_id,
            payload.business_name,
            payload.contact_number,
            payload.email,
            payload.business_category,
            payload.address,
            payload.logo_base64,
            now,
            now,
        ],
    ).map_err(|e| format!("Gagal menyimpan profil bisnis: {}", e))?;

    Ok("Profil bisnis berhasil disimpan".into())
}

// ─── File Save Helper ───────────────────────────────────────

#[tauri::command]
async fn save_pdf_file(data: String, filename: String) -> Result<String, String> {
    use base64::Engine;
    
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&data)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    let file = rfd::AsyncFileDialog::new()
        .set_title("Simpan Struk PDF")
        .set_file_name(&filename)
        .add_filter("PDF", &["pdf"])
        .save_file()
        .await;

    match file {
        Some(handle) => {
            handle.write(&bytes).await.map_err(|e| format!("Gagal menyimpan file: {}", e))?;
            Ok("File berhasil disimpan".into())
        }
        None => Err("Penyimpanan dibatalkan".into()),
    }
}

// ─── App Entry ──────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Store database in app data directory (outside of watched src-tauri folder)
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

            let db_path = app_data_dir.join("sellora_pos.db");
            let db = Connection::open(&db_path).expect("Failed to open database");
            init_db(&db);

            // One-off migration to fix old positive RETURN records
            let _ = db.execute("UPDATE inventory_movements SET quantity = -quantity WHERE movement_type = 'RETURN' AND quantity > 0", []);
            // Migration: drop legacy inventories table (stock is now computed from inventory_movements)
            let _ = db.execute("DROP TABLE IF EXISTS inventories", []);

            // Migration: add status column to taxes if not present
            let _ = db.execute("ALTER TABLE taxes ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", []);

            // Migration: add user_id column to root tables for multi-tenant data isolation
            let _ = db.execute("ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE units ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE products ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE suppliers ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE payment_methods ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE taxes ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE purchase_orders ADD COLUMN user_id INTEGER REFERENCES users(id)", []);
            let _ = db.execute("ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id)", []);

            let app_state = AppState {
                db: Mutex::new(db),
                current_user: Mutex::new(None),
                printer_state: Mutex::new(printer::PrinterState::default()),
            };

            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            register,
            login,
            check_auth,
            logout,
            // Suppliers
            get_suppliers,
            add_supplier,
            update_supplier,
            delete_supplier,
            // Categories
            get_categories,
            add_category,
            update_category,
            delete_category,
            // Units
            get_units,
            add_unit,
            update_unit,
            delete_unit,
            // Products
            get_products,
            add_product,
            update_product,
            delete_product,
            // Product Variants
            get_product_variants,
            add_product_variant,
            update_product_variant,
            delete_product_variant,
            // Utils
            gen_barcode,
            // Inventory / Stock
            get_inventory_list,
            get_inventory_movements,
            get_purchase_orders,
            get_purchase_order_items,
            add_purchase_order,
            receive_purchase_order,
            get_adjustments,
            add_adjustment,
            get_waste,
            add_waste,
            add_return,
            // Payment Methods
            get_payment_methods,
            add_payment_method,
            update_payment_method,
            delete_payment_method,
            // Taxes
            get_taxes,
            add_tax,
            update_tax,
            delete_tax,
            // Transactions
            create_transaction,
            hold_transaction,
            update_transaction_items,
            get_hold_transactions,
            get_transaction_items,
            get_transaction_payments,
            pay_transaction,
            cancel_transaction,
            get_transaction_history,
            refund_transaction,
            // Reports
            get_sales_report,
            get_sales_per_product,
            get_product_sales_history,
            get_sales_per_method,
            // Printer / Device
            printer::list_serial_ports,
            printer::scan_lan_devices,
            printer::scan_bluetooth_devices,
            printer::connect_device,
            printer::disconnect_device,
            printer::test_print_device,
            // User Account
            get_user_account,
            update_user_account,
            // Business Profile
            get_business_profile,
            save_business_profile,
            // File
            save_pdf_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
