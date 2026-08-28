import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const databaseName = process.env.MONGODB_DB || process.env.MONGO_DB || 'nabdah';
const apply = process.env.APPLY_MIGRATION === 'true';

async function run() {
  if (!uri) {
    throw new Error('MONGODB_URI (or MONGO_URI) is required');
  }

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const users = client.db(databaseName).collection('users');
    const filter = {
      parent_account_id: { $exists: true, $ne: null },
      $or: [
        { parent_provider_account_id: { $exists: false } },
        { parent_provider_account_id: null },
        { parent_provider_account_id: '' },
      ],
    };
    const candidates = await users.countDocuments(filter);
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', databaseName, candidates }));

    if (!apply) {
      console.log('Dry run complete. Re-run with APPLY_MIGRATION=true after verifying the candidate count.');
      return;
    }

    const result = await users.updateMany(filter, [
      { $set: { parent_provider_account_id: '$parent_account_id' } },
    ]);
    const remaining = await users.countDocuments(filter);
    if (remaining !== 0) {
      throw new Error(`migration_incomplete: ${remaining} candidate record(s) remain`);
    }
    console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount, remaining }));
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
