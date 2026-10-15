import { nudgeRoute } from './engagement.controller';
import { paidForRoute } from '../notifications/notifications.service';

describe('issue 416: notification routes the apps know', () => {
  it('a nudge opens the item when it has a page, else the service hub', () => {
    expect(nudgeRoute('medicine', 'm1')).toEqual({ route: '/pharmacy/product/m1' });
    expect(nudgeRoute('doctor', 'd 1')).toEqual({ route: '/doctors/d%201' });
    expect(nudgeRoute('lab_test', 't1')).toEqual({ route: '/labs/tests/t1' });
    expect(nudgeRoute('pregnancy', 'x')).toEqual({ route: '/maternity' });
    expect(nudgeRoute('medicine', null)).toEqual({ route: '/pharmacy' });
    expect(nudgeRoute('unknown_kind')).toEqual({ route: '/notifications' });
  });

  it('payment received opens what was paid for, never a wallet', () => {
    expect(paidForRoute('pharmacy', 'o1')).toEqual({ route: '/orders/o1' });
    expect(paidForRoute('consultation', 'a1')).toEqual({ route: '/tracking/consultation/a1' });
    expect(paidForRoute('lab', 'b1')).toEqual({ route: '/tracking/lab/b1' });
    expect(paidForRoute('insurance', 'i1')).toEqual({ route: '/notifications' });
    expect(paidForRoute('pharmacy', undefined)).toEqual({ route: '/notifications' });
  });
});
