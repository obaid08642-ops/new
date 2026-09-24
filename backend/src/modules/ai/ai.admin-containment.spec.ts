import { ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AiController } from './ai.controller';

/**
 * Administrative AI routing is an owner-requested admin feature (AI control page).
 * It must stay restricted to ADMIN and delegate to the gateway — never open to other roles.
 */
describe('AiController admin gateway access control', () => {
  const gateway = { listProviders: jest.fn(() => []), updateProvider: jest.fn(), setMode: jest.fn(), usageReport: jest.fn() };
  const controller = new AiController({} as any, gateway as any);
  const handlers: Array<keyof AiController> = ['gatewayStatus', 'updateProvider', 'setMode', 'usage'];

  it.each(handlers)('%s requires the ADMIN role', (name) => {
    const roles = Reflect.getMetadata(ROLES_KEY, (AiController.prototype as any)[name]);
    expect(roles).toEqual(expect.arrayContaining([UserRole.ADMIN]));
  });

  it('delegates to the AI gateway instead of fabricating state', () => {
    controller.gatewayStatus();
    expect(gateway.listProviders).toHaveBeenCalledTimes(1);
  });
});
