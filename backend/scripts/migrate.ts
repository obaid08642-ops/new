import 'reflect-metadata';
import mongoose from 'mongoose';
import { migrations } from '../src/common/migrations/registry';
import { MongoMigrationStore } from '../src/common/migrations/mongo-migration-store';
import { MigrationRunner } from '../src/common/migrations/migration-runner';

const command = process.argv[2] || 'status';
const migrationId = process.argv[3];
const mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) throw new Error('MONGO_URL is required for migrations');
if (!['status', 'up', 'down'].includes(command)) throw new Error(`unknown_migration_command:${command}`);
if (command === 'down' && !migrationId) throw new Error('migration_id_required_for_down');

async function main() {
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
  try {
    const runner = new MigrationRunner(
      new MongoMigrationStore(mongoose.connection),
      { db: mongoose.connection },
    );
    if (command === 'status') {
      console.log(JSON.stringify(await runner.status(migrations), null, 2));
      return;
    }
    if (command === 'up') {
      console.log(JSON.stringify({ applied: await runner.up(migrations) }));
      return;
    }
    console.log(JSON.stringify(await runner.down(migrations, migrationId as string)));
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'migration_failed');
  process.exitCode = 1;
});
