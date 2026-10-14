import { NotificationsService } from './notifications.service';
import { NotificationType } from '../../common/enums';

// Needs-review #418: appointment and report notifications carry their own type so the
// client files them under its medical group with the right icon.
describe('NotificationsService notification types', () => {
  const make = () => {
    const service = Object.create(NotificationsService.prototype) as NotificationsService;
    const create = jest.fn().mockResolvedValue({});
    (service as any).create = create;
    return { service, create };
  };

  it.each(['onApptCreated', 'onApptConfirmed', 'onApptCancelled', 'onApptCompleted'] as const)('%s is an appointment notification', async (handler) => {
    const { service, create } = make();
    await (service as any)[handler]({ patient_id: 'p-1', meta: {} });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'p-1', type: NotificationType.APPOINTMENT }));
  });

  it('a ready report is a labs notification', async () => {
    const { service, create } = make();
    await service.onReportReady({ patient_id: 'p-1', report_id: 'r-1' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ type: 'labs' }));
  });
});
