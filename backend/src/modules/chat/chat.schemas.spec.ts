import { ChatThreadSchema } from './chat.schemas';

describe('ChatThreadSchema indexes', () => {
  it('defines participant_ids only once', () => {
    const participantIndexes = ChatThreadSchema.indexes()
      .filter(([keys]) => JSON.stringify(keys) === JSON.stringify({ participant_ids: 1 }));
    expect(participantIndexes).toHaveLength(1);
  });
});
