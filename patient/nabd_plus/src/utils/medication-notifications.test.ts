import { MEDICATION_ACTION_SNOOZE, MEDICATION_ACTION_TAKEN, medicationNotificationAction } from './medication-notifications';

const response = (actionIdentifier: string, data: Record<string, unknown>) => ({
  actionIdentifier,
  notification: { request: { content: { data } } },
}) as any;

describe('medicationNotificationAction', () => {
  const medicationData = { type: 'medication_reminder', reminder_id: 'rem-1', time_key: '08:00' };

  it('maps an explicit taken action to the correct reminder and scheduled time', () => {
    expect(medicationNotificationAction(response(MEDICATION_ACTION_TAKEN, medicationData))).toEqual({ action: 'taken', reminderId: 'rem-1', timeKey: '08:00' });
  });

  it('maps the snooze action without recording the dose as taken', () => {
    expect(medicationNotificationAction(response(MEDICATION_ACTION_SNOOZE, medicationData))).toEqual({ action: 'snooze', reminderId: 'rem-1', timeKey: '08:00' });
  });

  it('opens a medication reminder on a normal notification tap', () => {
    expect(medicationNotificationAction(response('expo.modules.notifications.actions.DEFAULT', medicationData))).toEqual({ action: 'open', reminderId: 'rem-1', timeKey: '08:00' });
  });

  it('ignores notification payloads that are not medication reminders', () => {
    expect(medicationNotificationAction(response(MEDICATION_ACTION_TAKEN, { type: 'order', order_id: 'order-1' }))).toEqual({ action: 'ignore' });
  });
});
