// Creates the live-test admin (the first admin has no API; production already has one).
//   node tools/live/seed_admin.js   (uses backend/node_modules; MONGO_URL, DB_NAME like the app)
const path = require('path');
const req = (m) => require(path.resolve(__dirname, '../../backend/node_modules', m));
const mongoose = req('mongoose'); const bcrypt = req('bcryptjs'); const { randomUUID } = require('crypto');
(async () => {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', { dbName: process.env.DB_NAME || 'nabd_live' });
  const users = mongoose.connection.db.collection('users');
  const email = process.env.LIVE_ADMIN_EMAIL || 'admin@nabd.test';
  await users.updateOne({ email }, { $setOnInsert: { id: randomUUID(), full_name: 'Live Admin', email, phone: '+966500000001', role: 'admin', active: true, is_verified: true, password_hash: await bcrypt.hash(process.env.LIVE_ADMIN_PASSWORD || 'Adm1n!Live-Pass', 12), token_version: 0, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
  console.log('admin ready:', email);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
