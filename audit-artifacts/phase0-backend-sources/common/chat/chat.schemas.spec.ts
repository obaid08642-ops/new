import { ChatThreadSchema } from './chat.schemas';

describe('ChatThread schema indexes', () => {
  it('defines participant_ids as one explicit ascending index', () => {
    const indexes = ChatThreadSchema.indexes().filter(([fields]) => Object.keys(fields).length === 1 && fields.participant_ids === 1);
    expect(indexes).toHaveLength(1);
  });
});
