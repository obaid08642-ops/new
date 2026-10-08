/** Q-12: sort=distance validation + $geoNear wiring (mocked, no mongo). */
import { BadRequestException } from '@nestjs/common';
import { CareService } from './care.service';

const svcWith = (aggRows: any[], cityUser: any = null) => {
  const providerModel: any = {
    aggregate: async (pipe: any[]) => {
      (svcWith as any).lastPipe = pipe;
      return aggRows;
    },
    find: () => ({ sort: () => ({ skip: () => ({ limit: async () => aggRows }) }) }),
    countDocuments: async () => aggRows.length,
  };
  const userModel: any = { findOne: async () => cityUser };
  const slots: any = { hasSlotsToday: async () => true, nextAvailable: async () => null };
  return new (CareService as any)(providerModel, userModel, {}, slots);
};

describe('Q-12 nearest validation', () => {
  it('video + sort=distance -> 400', async () => {
    const svc = svcWith([]);
    await expect(svc.listDoctors({ sort: 'distance', nearest_type: 'video', lat: 21.5, lng: 39.1 } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('out-of-range coordinates -> 400', async () => {
    const svc = svcWith([]);
    await expect(svc.listDoctors({ sort: 'distance', nearest_type: 'clinic', lat: 123, lng: 39.1 } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('no location + anonymous -> 400', async () => {
    const svc = svcWith([]);
    await expect(svc.listDoctors({ sort: 'distance', nearest_type: 'clinic' } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('geo query carries the mode filter and returns distance_km', async () => {
    const svc = svcWith([{ id: 'd1', city: 'Jeddah', consultation_modes: ['clinic'], _dist_m: 800 }]);
    const out: any = await svc.listDoctors({ sort: 'distance', nearest_type: 'clinic', lat: 21.5, lng: 39.1, limit: 5 } as any);
    const geo = (svcWith as any).lastPipe[0].$geoNear;
    expect(geo.query.consultation_modes).toEqual({ $in: ['clinic'] });
    expect(geo.near).toEqual({ type: 'Point', coordinates: [39.1, 21.5] });
    expect(out.items[0].distance_km).toBe(0.8);
  });

  it('city fallback for a signed-in patient without location', async () => {
    const svc = svcWith([{ id: 'd9', city: 'Jeddah', consultation_modes: ['clinic'] }], { id: 'pat-1', city: 'Jeddah' });
    const out: any = await svc.listDoctors({
      sort: 'distance', nearest_type: 'clinic', user: { id: 'pat-1', role: 'patient' },
    } as any);
    expect(out.items[0].city).toBe('Jeddah');
    expect(out.items[0].distance_km ?? null).toBeNull();
  });
});
