import { ProviderOpsService } from './provider-ops.module';

// The provider's "online" switch. The server flipped whatever it held on every tap while the app always started from
// "offline", so after a restart "go online" turned an online provider offline (orders are routed from this state).
function setup(initial: boolean | null) {
  const rows: Record<string, any> = initial === null ? {} : { 'prov-1': { provider_id: 'prov-1', instant_available: initial } };
  const routing: Record<string, any> = {};
  const conn = {
    collection: (name: string) => (name === 'provideravailability'
      ? {
        findOne: async (f: any) => rows[f.provider_id] ?? null,
        updateOne: async (f: any, u: any) => { rows[f.provider_id] = { ...(rows[f.provider_id] || {}), ...u.$set }; },
      }
      : {
        updateOne: async (f: any, u: any) => { routing[f.provider_account_id] = { ...(routing[f.provider_account_id] || {}), ...u.$set }; },
      }),
  };
  return { svc: new ProviderOpsService(conn as never), rows, routing };
}
const doctor = { id: 'prov-1', role: 'doctor' };

describe('provider instant availability', () => {
  it('sets the state the provider asked for, also when the app and the server disagree', async () => {
    const { svc, rows, routing } = setup(true); // the server says online; the app, freshly started, shows offline
    const out = await (svc as any).toggleInstantAvailability(doctor, true); // the provider taps "go online"
    expect(out).toEqual({ instant_available: true });
    expect(rows['prov-1'].instant_available).toBe(true);
    expect(routing['prov-1'].status).toBe('accepting_orders');
  });

  it('stays off when asked for off while the server already holds off', async () => {
    const { svc, routing } = setup(false); // the app shows online, the server says offline; the provider taps "go offline"
    expect(await (svc as any).toggleInstantAvailability(doctor, false)).toEqual({ instant_available: false });
    expect(routing['prov-1'].status).toBe('offline');
  });

  it('still flips when an older app sends no state', async () => {
    const { svc } = setup(false);
    expect(await svc.toggleInstantAvailability(doctor)).toEqual({ instant_available: true });
  });

  it('reads the state the server holds (offline when there is no record)', async () => {
    expect(await (setup(true).svc as any).instantAvailability(doctor)).toEqual({ instant_available: true });
    expect(await (setup(null).svc as any).instantAvailability(doctor)).toEqual({ instant_available: false });
  });
});
