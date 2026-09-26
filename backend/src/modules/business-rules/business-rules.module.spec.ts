import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderProfile } from '../../schemas/provider-profile.schema';
import { BusinessRulesService } from './business-rules.module';
import { UpdateSurgeDto, ValidateRulesDto } from './business-rules.dto';
import { ValidationPipe } from '@nestjs/common';

describe('BusinessRulesService surge configuration', () => {
  let service: BusinessRulesService;

  beforeEach(() => {
    service = new BusinessRulesService({} as unknown as Model<ProviderProfile>);
  });

  it('updates only bounded numeric settings and never reflects extra body properties', () => {
    const result = service.updateSurgeConfig({ multiplier: 1.25, startHour: 19 } satisfies UpdateSurgeDto);

    expect(result).toEqual({ ok: true });
    expect(service.getSurgeConfig()).toEqual({ startHour: 19, endHour: 22, multiplier: 1.25 });
    expect(JSON.stringify(result)).not.toContain('<script>');
  });

  it('rejects out-of-range values instead of storing or echoing them', () => {
    expect(() => service.updateSurgeConfig({ multiplier: 6 } satisfies UpdateSurgeDto)).toThrow(BadRequestException);
    expect(service.getSurgeConfig()).toEqual({ startHour: 18, endHour: 22, multiplier: 1.1 });
  });

  it('rejects an object where the nested provider user_id must be a string', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    await expect(pipe.transform(
      { kind: 'pharmacy', provider: { user_id: { $ne: null } } },
      { type: 'body', metatype: ValidateRulesDto },
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pins provider hydration to a scalar equality filter', async () => {
    const query = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) };
    const findOne = jest.fn().mockReturnValue(query);
    service = new BusinessRulesService({ findOne } as unknown as Model<ProviderProfile>);

    await service.validate({ kind: 'pharmacy', provider: { user_id: 'provider-1' } });

    expect(findOne).toHaveBeenCalledWith(
      { user_id: { $eq: 'provider-1' } },
      { type: 1, accepted_insurance: 1, nursing_services: 1, test_categories: 1, equipment_list: 1, _id: 0 },
    );
  });
});
