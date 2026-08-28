// Fired after creating tables to ensure performance on common queries
export const indexCreationQueries = [
  // Users
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`,
  `CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);`,
  
  // Sync
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_metadata_status ON sync_metadata(sync_status);`,
  
  // Appointments
  `CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON appointments(provider_id);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_at);`,
  
  // Orders
  `CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
];
