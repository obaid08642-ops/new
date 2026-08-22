export const coreTables = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`,

  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,
];

export const providerTables = [
  `CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    specialty TEXT NOT NULL,
    license_number TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY(provider_id) REFERENCES providers(id)
  );`,

  `CREATE TABLE IF NOT EXISTS pharmacies (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    delivery_available INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY(provider_id) REFERENCES providers(id)
  );`,

  `CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY(provider_id) REFERENCES providers(id)
  );`,

  `CREATE TABLE IF NOT EXISTS labs (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    accreditation TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1,
    FOREIGN KEY(provider_id) REFERENCES providers(id)
  );`,
];

export const transactionalTables = [
  `CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    street TEXT,
    city TEXT,
    is_default INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,
];

export const featuresTables = [
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS wallet (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'SAR',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS loyalty (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,
];

export const systemTables = [
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entity_id TEXT,
    entity_type TEXT,
    action TEXT NOT NULL,
    changes TEXT,
    created_at INTEGER NOT NULL,
    created_by TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_enabled INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS configuration (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,
];

export const syncTables = [
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    operation TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS background_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  `CREATE TABLE IF NOT EXISTS cache_metadata (
    id TEXT PRIMARY KEY,
    cache_key TEXT UNIQUE NOT NULL,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    created_by TEXT,
    updated_by TEXT,
    version INTEGER DEFAULT 1
  );`,

  // Core requirement: Sync Metadata table to decouple sync state
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    local_version INTEGER DEFAULT 1,
    server_version INTEGER DEFAULT 1,
    sync_status TEXT NOT NULL,
    last_sync INTEGER,
    last_modified INTEGER NOT NULL,
    checksum TEXT,
    UNIQUE(entity_id, entity_type)
  );`
];

export const ALL_SCHEMAS = [
  ...coreTables,
  ...providerTables,
  ...transactionalTables,
  ...featuresTables,
  ...systemTables,
  ...syncTables,
];
