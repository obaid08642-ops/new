import { PATH_METADATA } from '@nestjs/common/constants';
import { ProviderCommissionsController } from './provider-commission.service';

/** The admin screen calls /api/admin/admin/provider-commissions/...; the backend route must carry the same `admin/` prefix as the other admin controllers (it was mounted without it, a 404). */
describe('ProviderCommissionsController route', () => {
  it('is mounted under admin/', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProviderCommissionsController)).toBe('admin/provider-commissions');
  });
});
