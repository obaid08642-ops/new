// Creates the live-test admins (the first admin has no API; production already has one). Owner decision 29 makes admin
// roles restrictive: the gate admin (LIVE_ADMIN_EMAIL, role admin) holds a custom operations role with every permission
// except modules.manage, which only the owner holds; the owner (LIVE_OWNER_EMAIL, super_admin) is also the designated
// owner email (tools/live/start-backend.sh sets ADMIN_PASSKEY_EMAIL to it).
//   node tools/live/seed_admin.js   (uses backend/node_modules; MONGO_URL, DB_NAME like the app)
const path = require('path');
const req = (m) => require(path.resolve(__dirname, '../../backend/node_modules', m));
const fs = require('fs');
const mongoose = req('mongoose'); const bcrypt = req('bcryptjs'); const { randomUUID } = require('crypto');
(async () => {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', { dbName: process.env.DB_NAME || 'nabd_live' });
  const users = mongoose.connection.db.collection('users');
  const email = process.env.LIVE_ADMIN_EMAIL || 'admin@nabd.test';
  await users.updateOne({ email }, { $setOnInsert: { id: randomUUID(), full_name: 'Live Admin', email, phone: '+966500000001', role: 'admin', active: true, is_verified: true, password_hash: await bcrypt.hash(process.env.LIVE_ADMIN_PASSWORD || 'Adm1n!Live-Pass', 12), token_version: 0, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  // Every catalogued permission (the Permission enum of backend/src/common/permissions.ts) except modules.manage.
  const enumSrc = fs.readFileSync(path.resolve(__dirname, '../../backend/src/common/permissions.ts'), 'utf8').match(/export enum Permission \{([\s\S]*?)\n\}/);
  if (!enumSrc) throw new Error('Permission enum not found in backend/src/common/permissions.ts');
  const permissions = [...enumSrc[1].matchAll(/=\s*'([^']+)'/g)].map((m) => m[1]).filter((p) => p !== 'modules.manage');
  await mongoose.connection.db.collection('admin_custom_roles').updateOne({ key: 'live_gate_operations' }, { $set: { key: 'live_gate_operations', name_ar: 'تشغيل بوابة الاختبار', permissions, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  await users.updateOne({ email }, { $set: { custom_role_keys: ['live_gate_operations'] } });
  console.log('admin ready:', email, `(operations role: ${permissions.length} permissions, no modules.manage)`);
  // Issues 955 / 995: the emergency controls (module switches, kill switches, emergency maintenance) need modules.manage,
  // which only super_admin holds; j_admin_kill_switches signs in with this account to drive them.
  const owner = process.env.LIVE_OWNER_EMAIL || 'owner@nabd.test';
  await users.updateOne({ email: owner }, { $setOnInsert: { id: randomUUID(), full_name: 'Live Owner', email: owner, phone: '+966500000002', role: 'super_admin', active: true, is_verified: true, password_hash: await bcrypt.hash(process.env.LIVE_OWNER_PASSWORD || 'Own3r!Live-Pass', 12), token_version: 0, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  console.log('super admin ready:', owner);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
