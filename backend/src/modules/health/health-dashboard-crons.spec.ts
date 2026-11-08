import { DECLARED_CRONS, CRONS_NOTE } from './health-dashboard.controller';

// Audit-3 gap 32: the cron list is a declared schedule, and says so. It must not look like live run status.
describe('health dashboard cron list', () => {
  it('lists each job once with a schedule and where it runs', () => {
    const names = DECLARED_CRONS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const c of DECLARED_CRONS) {
      expect(c.schedule).toBeTruthy();
      expect(['host', 'app']).toContain(c.where);
    }
  });

  it('carries no status field: nothing records a run, so none can be claimed', () => {
    for (const c of DECLARED_CRONS) expect(c).not.toHaveProperty('status');
  });

  it('says in Arabic and English that it is the declared schedule, not run status', () => {
    expect(CRONS_NOTE.ar).toContain('المعلن');
    expect(CRONS_NOTE.en.toLowerCase()).toContain('declared');
    expect(CRONS_NOTE.en.toLowerCase()).toContain('not live run status');
  });
});
