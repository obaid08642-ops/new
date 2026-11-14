import { Test } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { BedsService } from './facility-ops.module';
import { NotFoundException } from '@nestjs/common';

// getWardBeds: an occupied bed carries the id of its active admission (gap 20, bed rows had no admission id).
function chain(rows: any) {
  return { lean: jest.fn().mockResolvedValue(rows) };
}

describe('BedsService.getWardBeds admission ids', () => {
  let svc: BedsService;
  const ward = { findOne: jest.fn() };
  const bed = { find: jest.fn() };
  const admission = { find: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        BedsService,
        { provide: getModelToken('Ward'), useValue: ward },
        { provide: getModelToken('Bed'), useValue: bed },
        { provide: getModelToken('Admission'), useValue: admission },
        { provide: getConnectionToken(), useValue: { db: { collection: jest.fn() } } },
      ],
    }).compile();
    svc = mod.get(BedsService);
  });

  it('adds admission_id to occupied beds only, from the active admission of that bed', async () => {
    ward.findOne.mockReturnValue(chain({ id: 'w1' }));
    bed.find.mockReturnValue(chain([
      { id: 'b1', status: 'occupied' },
      { id: 'b2', status: 'available' },
      { id: 'b3', status: 'occupied' },
    ]));
    admission.find.mockReturnValue(chain([{ id: 'a1', bed_id: 'b1' }]));
    const out: any[] = await svc.getWardBeds('fac1', 'w1');
    expect(out.find((b) => b.id === 'b1').admission_id).toBe('a1');
    expect(out.find((b) => b.id === 'b3').admission_id).toBeNull();
    expect('admission_id' in out.find((b) => b.id === 'b2')).toBe(false);
    expect(admission.find).toHaveBeenCalledWith({ facility_id: { $eq: 'fac1' }, bed_id: { $in: ['b1', 'b3'] }, status: 'active' });
  });

  it('does not query admissions when no bed is occupied', async () => {
    ward.findOne.mockReturnValue(chain({ id: 'w1' }));
    bed.find.mockReturnValue(chain([{ id: 'b1', status: 'available' }]));
    const out = await svc.getWardBeds('fac1', 'w1');
    expect(out).toEqual([{ id: 'b1', status: 'available' }]);
    expect(admission.find).not.toHaveBeenCalled();
  });

  it('refuses a ward of another facility', async () => {
    ward.findOne.mockReturnValue(chain(null));
    await expect(svc.getWardBeds('fac1', 'w9')).rejects.toThrow(NotFoundException);
  });
});
