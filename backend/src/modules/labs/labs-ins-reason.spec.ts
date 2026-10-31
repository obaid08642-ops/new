import { ValidationPipe } from '@nestjs/common';
import { UpdateInsDto } from './labs.dto';

// The lab records why the insurer refused: the service reads `reason`, so the validation pipe must let it through.
describe('PATCH /labs/bookings/:id/insurance body', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const run = (body: object) => pipe.transform(body, { type: 'body', metatype: UpdateInsDto });

  it('accepts a rejection with its reason', async () => {
    await expect(run({ status: 'rejected', reason: 'الخدمة غير مشمولة في فئة الوثيقة', items: [] })).resolves.toMatchObject({ reason: 'الخدمة غير مشمولة في فئة الوثيقة' });
  });
  it('still refuses a field the API does not know, and a non-string reason', async () => {
    await expect(run({ status: 'rejected', surprise: 1 })).rejects.toThrow();
    await expect(run({ status: 'rejected', reason: { $ne: 1 } })).rejects.toThrow();
  });
});
