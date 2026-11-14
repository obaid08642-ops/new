import { DICTIONARY as I18N_DICT } from '../../i18n/i18n.service';

/** The patient push for every allocation step has text: a missing key reached the patient as the raw key "pharmacy.alloc_delivered.title". */
describe('pharmacy allocation progress messages', () => {
  it.each(['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'])('%s has a title and a body in ar, en and ur', (status) => {
    for (const part of ['title', 'body']) {
      const entry = (I18N_DICT as any)[`pharmacy.alloc_${status}.${part}`];
      expect(entry).toBeDefined();
      for (const l of ['ar', 'en', 'ur']) expect(String(entry[l] || '').trim().length).toBeGreaterThan(3);
    }
  });
});
