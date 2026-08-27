import { LabResultSchema } from '../schemas/lab-result.schema';
import { MoodEntrySchema, MeditationSessionSchema, BreathingSessionSchema } from '../schemas/mental-health.schema';

function duplicateIndexKeys(schema: { indexes: () => Array<[unknown, unknown]> }) {
  const keys = schema.indexes().map(([key]) => JSON.stringify(key));
  return keys.filter((key, position) => keys.indexOf(key) !== position);
}

describe('Mongoose index governance contract', () => {
  it('declares LabResult booking_id only once through the property index', () => {
    const bookingIndexes = LabResultSchema.indexes().filter(([key]) => JSON.stringify(key) === JSON.stringify({ booking_id: 1 }));
    expect(bookingIndexes).toHaveLength(1);
  });

  it('has no duplicate compound index declarations in mental-health schemas', () => {
    expect(duplicateIndexKeys(MoodEntrySchema)).toEqual([]);
    expect(duplicateIndexKeys(MeditationSessionSchema)).toEqual([]);
    expect(duplicateIndexKeys(BreathingSessionSchema)).toEqual([]);
    expect(MoodEntrySchema.indexes().map(([key]) => key)).toContainEqual({ patient_id: 1, logged_at: -1 });
  });
});
