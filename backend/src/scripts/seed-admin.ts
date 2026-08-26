/**
 * M0-01 — Secure admin seeding script (replaces the removed AuthService.seedAdmin).
 *
 * Run manually ONCE per environment:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-admin.ts
 *
 * Required environment variables:
 *   ADMIN_PHONE       e.g. +9665XXXXXXXX
 *   ADMIN_EMAIL       e.g. admin@yourdomain.com
 *   ADMIN_PASSWORD    strong password (min 12 chars) — NOT stored anywhere else
 *   MONGO_URL         database connection string
 *
 * The script is idempotent: it does nothing if the admin phone already exists.
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

async function main() {
  const { ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD, MONGO_URL, DB_NAME } = process.env;

  if (!ADMIN_PHONE || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing required env vars: ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD');
    process.exit(1);
  }
  if (ADMIN_PASSWORD.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters');
    process.exit(1);
  }
  if (!MONGO_URL) {
    console.error('MONGO_URL is required');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URL, { dbName: DB_NAME || 'nabd' });
  const users = mongoose.connection.collection('users');

  const existing = await users.findOne({ phone: ADMIN_PHONE });
  if (existing) {
    console.log(`Admin with phone ${ADMIN_PHONE} already exists — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await users.insertOne({
    id: uuid(),
    full_name: 'Nabdah Platform Admin',
    phone: ADMIN_PHONE,
    email: ADMIN_EMAIL.toLowerCase(),
    password_hash,
    role: 'admin',
    active: true,
    is_guest: false,
    preferred_lang: 'ar',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Admin created for phone ${ADMIN_PHONE}. Change the password after first login.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
