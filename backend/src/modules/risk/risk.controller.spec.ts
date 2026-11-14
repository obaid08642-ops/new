import { BadRequestException } from '@nestjs/common';
import { RiskController } from './risk.controller';

describe('22.11 RiskController rescore', () => {
  const make = () => {
    const risk: any = { evaluate: jest.fn(async (id: string) => ({ user_id: id, score: 60, level: 'medium', signals: [] })) };
    const audit: any = { write: jest.fn(async () => undefined) };
    return { ctl: new RiskController(risk, audit), risk, audit };
  };

  it('re-scores and leaves an audit row naming the admin and the account', async () => {
    const { ctl, audit } = make();
    const out = await ctl.rescore({ id: 'adm-1', role: 'admin' }, 'user-7');
    expect(out).toMatchObject({ user_id: 'user-7', score: 60 });
    expect(audit.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'risk.rescore', user_id: 'adm-1', resource_kind: 'user', resource_id: 'user-7', details: { score: 60, level: 'medium' } }));
  });

  it('refuses an id that is not an id, with no score and no audit row', async () => {
    const { ctl, risk, audit } = make();
    await expect(ctl.rescore({ id: 'adm-1' }, 'x; drop')).rejects.toBeInstanceOf(BadRequestException);
    expect(risk.evaluate).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('the rescore route needs the security permission, the reads need analytics.read', () => {
    const perms = (name: keyof RiskController) => Reflect.getMetadata('permissions', RiskController.prototype[name] as never);
    expect(perms('rescore')).toEqual(expect.arrayContaining(['security.manage']));
    expect(perms('summary')).toEqual(expect.arrayContaining(['analytics.read']));
  });
});
