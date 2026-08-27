import { GoneException } from '@nestjs/common';
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';

describe('PharmacyBroadcastService legacy claim guard', () => {
  it('rejects the legacy winner-take-all claim before it can lock a patient order', async () => {
    const service = Object.create(PharmacyBroadcastService.prototype) as PharmacyBroadcastService;
    await expect(service.claimHaveAll({ id: 'pharmacy-1', role: 'pharmacy' }, 'order-1')).rejects.toBeInstanceOf(GoneException);
  });
});
