import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'pos_toko_kurnia.db';

let _db: ReturnType<typeof drizzle> | null = null;
let _sqliteDb: SQLite.SQLiteDatabase | null = null;

/**
 * Get the Drizzle database instance (singleton).
 * Call this from components/hooks after DB is initialized.
 */
export function getDb() {
  if (!_db) {
    throw new Error('Database belum diinisialisasi. Panggil initDatabase() terlebih dahulu.');
  }
  return _db;
}

/**
 * Get the raw SQLite database instance for direct queries.
 */
export function getSqliteDb() {
  if (!_sqliteDb) {
    throw new Error('Database belum diinisialisasi. Panggil initDatabase() terlebih dahulu.');
  }
  return _sqliteDb;
}

/**
 * Initialize the database: open connection, enable WAL, create all tables.
 */
export async function initDatabase() {
  if (_db) return _db;

  _sqliteDb = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable WAL mode for better performance
  await _sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
  // Enable foreign keys
  await _sqliteDb.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables
  await _sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE,
      full_name   TEXT NOT NULL,
      pin_hash    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('admin', 'kasir')),
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sku         TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      brand       TEXT,
      unit        TEXT NOT NULL DEFAULT 'pcs',
      price       INTEGER NOT NULL,
      stock       REAL NOT NULL DEFAULT 0,
      min_stock   REAL NOT NULL DEFAULT 5,
      qty_step    REAL NOT NULL DEFAULT 1,
      unit_type   TEXT NOT NULL DEFAULT 'piece'
                  CHECK(unit_type IN ('piece', 'bulk_small', 'liquid')),
      location    TEXT,
      has_qr      INTEGER NOT NULL DEFAULT 0,
      cost_price  INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      notes       TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL REFERENCES products(id),
      field       TEXT NOT NULL CHECK(field IN ('price', 'cost_price')),
      old_value   INTEGER NOT NULL,
      new_value   INTEGER NOT NULL,
      changed_by  INTEGER NOT NULL REFERENCES users(id),
      notes       TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code  TEXT NOT NULL UNIQUE,
      full_name    TEXT NOT NULL,
      phone        TEXT NOT NULL UNIQUE,
      address      TEXT,
      debt_limit   INTEGER NOT NULL DEFAULT 0,
      debt_balance INTEGER NOT NULL DEFAULT 0,
      is_active    INTEGER NOT NULL DEFAULT 1,
      notes        TEXT,
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL CHECK(type IN ('percentage', 'fixed')),
      value        REAL NOT NULL,
      scope        TEXT NOT NULL DEFAULT 'all'
                   CHECK(scope IN ('all', 'category', 'product', 'member')),
      scope_id     INTEGER,
      min_purchase INTEGER NOT NULL DEFAULT 0,
      max_discount INTEGER,
      is_active    INTEGER NOT NULL DEFAULT 0,
      notes        TEXT,
      created_by   INTEGER NOT NULL REFERENCES users(id),
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      trx_code        TEXT NOT NULL UNIQUE,
      customer_id     INTEGER REFERENCES customers(id),
      cashier_id      INTEGER NOT NULL REFERENCES users(id),
      payment_type    TEXT NOT NULL CHECK(payment_type IN ('cash', 'debt')),
      subtotal        INTEGER NOT NULL,
      discount_id     INTEGER REFERENCES discounts(id),
      discount_name   TEXT,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total           INTEGER NOT NULL,
      amount_paid     INTEGER NOT NULL DEFAULT 0,
      change_amount   INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'DONE' CHECK(status IN ('DONE', 'VOID')),
      void_reason     TEXT,
      void_by         INTEGER REFERENCES users(id),
      void_at         TEXT,
      notes           TEXT,
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id  INTEGER NOT NULL REFERENCES transactions(id),
      product_id      INTEGER NOT NULL REFERENCES products(id),
      product_name    TEXT NOT NULL,
      product_sku     TEXT NOT NULL,
      product_unit    TEXT NOT NULL,
      unit_price      INTEGER NOT NULL,
      cost_price      INTEGER NOT NULL DEFAULT 0,
      quantity        REAL NOT NULL,
      subtotal        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id     INTEGER NOT NULL REFERENCES customers(id),
      cashier_id      INTEGER NOT NULL REFERENCES users(id),
      amount          INTEGER NOT NULL,
      notes           TEXT,
      paid_at         TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id  INTEGER NOT NULL REFERENCES products(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      type        TEXT NOT NULL CHECK(type IN ('sale', 'adjustment', 'void_return')),
      qty_before  REAL NOT NULL,
      qty_change  REAL NOT NULL,
      qty_after   REAL NOT NULL,
      notes       TEXT,
      created_at  TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_flow (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      type            TEXT NOT NULL CHECK(type IN ('in', 'out')),
      category        TEXT NOT NULL,
      amount          INTEGER NOT NULL,
      transaction_id  INTEGER REFERENCES transactions(id),
      user_id         INTEGER NOT NULL REFERENCES users(id),
      notes           TEXT,
      created_at      TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      category     TEXT NOT NULL,
      amount       INTEGER NOT NULL,
      notes        TEXT,
      expense_date TEXT NOT NULL,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      created_at   TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id       INTEGER NOT NULL REFERENCES users(id),
      opening_balance  INTEGER NOT NULL DEFAULT 0,
      closing_balance  INTEGER,
      system_balance   INTEGER,
      difference       INTEGER,
      status           TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
      opened_at        TEXT DEFAULT CURRENT_TIMESTAMP,
      closed_at        TEXT,
      notes            TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  _db = drizzle(_sqliteDb, { schema });

  return _db;
}

/**
 * Close the database connection.
 */
export async function closeDatabase() {
  if (_sqliteDb) {
    await _sqliteDb.closeAsync();
    _sqliteDb = null;
    _db = null;
  }
}
