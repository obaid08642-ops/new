import { toRxRow, mergeRxRows } from '../rxReview';

describe('rxReview', () => {
  const raw = {
    id: 'rx1', state: 'SENT_TO_PHARMACY', verified_by: '',
    items: [
      { medicine_name_ar: 'باراسيتامول', medicine_name_en: 'Paracetamol', dose: '500mg', manual_review_status: 'NOT_APPLICABLE' },
      { medicine_name_ar: 'دواء مكتوب', dose: '1', manual_review_status: 'PENDING_REVIEW' },
    ],
  };

  it('maps a server row and counts the manual lines that wait for review', () => {
    const row = toRxRow(raw, false);
    expect(row?.items.map(i => i.name)).toEqual(['Paracetamol', 'دواء مكتوب']);
    expect(row?.pendingManual).toBe(1);
    expect(row?.items[1].index).toBe(1);
    expect(row?.verified).toBe(false);
  });

  it('prefers the Arabic name in Arabic and drops rows without an id', () => {
    expect(toRxRow(raw, true)?.items[0].name).toBe('باراسيتامول');
    expect(toRxRow({ state: 'x' }, true)).toBeNull();
    expect(toRxRow(null, true)).toBeNull();
  });

  it('keeps one row per prescription id when both queues return it', () => {
    const a = toRxRow(raw, false)!;
    const b = toRxRow({ ...raw, state: 'PARTIALLY_EDITED' }, false)!;
    expect(mergeRxRows([a], [b])).toHaveLength(1);
    expect(mergeRxRows([a], [b])[0].state).toBe('SENT_TO_PHARMACY');
  });
});
