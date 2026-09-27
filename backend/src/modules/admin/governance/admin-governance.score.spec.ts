import { AdminGovernanceService } from './admin-governance.module';

// CI live gate finding: appointment history entries are {state, at} (not {to}); scoring threw
// unknown_domain_state and took the whole admin command center down (400).
describe('AdminGovernanceService.scoreBucket', () => {
  const svc = new AdminGovernanceService({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const score = (items: any[]) => (svc as any).scoreBucket(items);

  it('scores consultations whose history uses {state}', () => {
    const t0 = new Date('2026-09-27T08:00:00Z');
    const m = score([{ kind: 'consultation', state: 'COMPLETED', createdAt: t0, state_history: [
      { state: 'CONFIRMED', at: new Date(t0.getTime() + 60000) }, { state: 'COMPLETED', at: new Date(t0.getTime() + 3600000) },
    ] }]);
    expect(m.completion_rate).toBe(100);
    expect(m.acceptance_rate).toBe(100);
  });

  it('an unknown or missing state never throws', () => {
    expect(() => score([{ kind: 'consultation', state: undefined, state_history: [{ foo: 1 }] }, { kind: 'lab', state: 'WEIRD' }])).not.toThrow();
  });
});
