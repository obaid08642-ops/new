import { analysisItems } from '../procurementAnalysis';

describe('analysisItems', () => {
  it('reads the lines from the axios response body', () => {
    const response = { status: 201, data: { ok: true, items: [{ raw_name_string: 'Panadol', requested_quantity: 10, matched: true, medicine_id: 'm1', category_group: 'medical' }], counts: { total: 1 } } };
    expect(analysisItems(response)).toEqual([response.data.items[0]]);
  });
  it('is empty when the body has no items, or the response is not there', () => {
    expect(analysisItems({ data: { ok: true } })).toEqual([]);
    expect(analysisItems(undefined)).toEqual([]);
  });
  it('drops a line without a name', () => {
    expect(analysisItems({ data: { items: [{ requested_quantity: 1 }, { raw_name_string: 'Gauze', requested_quantity: 2 }] } })).toHaveLength(1);
  });
});
