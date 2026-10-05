/**
 * F3 — the care discovery controller had the same bare-parseInt hole as the
 * medicines admin paths: `?page=abc` became NaN and flowed into the service.
 * `queryInt` coerces to the documented defaults (doctors 1/20, facilities 50).
 */
import { CareController } from './care.controller';

describe('F3 care controller coerces ?page=abc / ?limit=abc (mocked service)', () => {
  const ctrlWith = () => {
    const svc: any = {
      listDoctors: jest.fn(async () => ({})),
      listFacilities: jest.fn(async () => ({})),
    };
    return { ctrl: new CareController(svc), svc };
  };

  it('doctors ?page=abc&limit=abc → page 1, limit 20', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).doctors(
      undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined,
      'abc', 'abc',
    );
    expect(svc.listDoctors).toHaveBeenCalled();
    const arg = svc.listDoctors.mock.calls[0][0];
    expect(arg.page).toBe(1);
    expect(arg.limit).toBe(20);
  });

  it('facilities ?limit=abc → limit 50', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).facilities(undefined, undefined, undefined, undefined, 'abc');
    expect(svc.listFacilities.mock.calls[0][0]).toMatchObject({ limit: 50 });
  });

  it('valid numbers still pass through untouched', async () => {
    const { ctrl, svc } = ctrlWith();
    await (ctrl as any).doctors(
      undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined,
      '3', '15',
    );
    expect(svc.listDoctors.mock.calls[0][0]).toMatchObject({ page: 3, limit: 15 });
  });
});
