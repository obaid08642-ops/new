import { SupportChatController } from './support-chat.controller';

// OC-C C-14 (760): the support chat exposes reply/read state.
function controllerFor(ticket: any) {
  const updates: any[] = [];
  const col: any = {
    findOne: jest.fn().mockResolvedValue(ticket),
    updateOne: jest.fn().mockImplementation(async () => { updates.push(1); return {}; }),
  };
  const conn: any = { collection: jest.fn(() => col) };
  const controller = new SupportChatController(conn);
  return { controller, col, updates };
}

const TICKET = {
  id: 'sup-1', tracking_id: 'SUP-ABC', status: 'IN_PROGRESS',
  patient_read_at: new Date('2026-01-01T00:00:00Z'),
  thread: [
    { by: 'pat-1', role: 'patient', message: 'hello', at: new Date('2026-01-01T00:00:00Z') },
    { by: 'agent-7', role: 'agent', message: 'we are on it', at: new Date('2026-01-02T00:00:00Z') },
  ],
};

describe('OC C-14 support chat state', () => {
  it('lists messages and stamps the patient read time', async () => {
    const { controller, updates } = controllerFor(TICKET);
    const rows: any[] = await controller.bareList({ id: 'pat-1' });
    expect(rows).toHaveLength(2);
    expect(updates.length).toBeGreaterThan(0);
  });

  it('reports unread agent replies', async () => {
    const { controller } = controllerFor(TICKET);
    const state: any = await controller.chatState({ id: 'pat-1' });
    expect(state.ticket_id).toBe('sup-1');
    expect(state.unread_agent_replies).toBe(1);
    expect(typeof state.last_agent_reply_at).toBeTruthy();
  });

  it('reports zero unread when the patient already read the reply', async () => {
    const read = { ...TICKET, patient_read_at: new Date('2026-01-03T00:00:00Z') };
    const { controller } = controllerFor(read);
    const state: any = await controller.chatState({ id: 'pat-1' });
    expect(state.unread_agent_replies).toBe(0);
  });
});
