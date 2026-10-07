import { Command } from 'commander';
import { MongoClient, Db } from 'mongodb';

interface MigrationOptions {
  apply: boolean;
  uri: string;
}

async function migrateFacilityRatingReviews(options: MigrationOptions) {
  const client = new MongoClient(options.uri);
  await client.connect();
  const db: Db = client.db();

  console.log('[Migration] Starting facility rating/reviews_count removal...');
  console.log(`[Migration] Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}`);

  try {
    // Check current state
    const facilities = db.collection('facilities');
    const count = await facilities.countDocuments({
      $or: [
        { rating: { $exists: true } },
        { reviews_count: { $exists: true } }
      ]
    });
    console.log(`[Migration] Found ${count} facilities with rating/reviews_count fields`);

    if (options.apply && count > 0) {
      // Remove rating field
      const ratingResult = await facilities.updateMany(
        { rating: { $exists: true } },
        { $unset: { rating: '' } }
      );
      console.log(`[Migration] Removed 'rating' from ${ratingResult.modifiedCount} documents`);

      // Remove reviews_count field
      const reviewsResult = await facilities.updateMany(
        { reviews_count: { $exists: true } },
        { $unset: { reviews_count: '' } }
      );
      console.log(`[Migration] Removed 'reviews_count' from ${reviewsResult.modifiedCount} documents`);
    }

    // Verify
    const remaining = await facilities.countDocuments({
      $or: [
        { rating: { $exists: true } },
        { reviews_count: { $exists: true } }
      ]
    });
    console.log(`[Migration] Remaining documents with rating/reviews_count: ${remaining}`);

    console.log('[Migration] Complete!');
  } finally {
    await client.close();
  }
}

const program = new Command();
program
  .name('migrate-facility-rating-reviews')
  .description('Remove rating and reviews_count fields from facilities collection')
  .requiredOption('--uri <string>', 'MongoDB URI')
  .option('--apply', 'Apply changes (default: dry-run)', false);

program.parse(process.argv);

const options = program.opts<MigrationOptions>();
migrateFacilityRatingReviews(options).catch(console.error);