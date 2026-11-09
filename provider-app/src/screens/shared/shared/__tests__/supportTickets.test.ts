import { asTickets, asFaqs, faqText, ticketStatus, serverMessage } from '../supportTickets';

describe('supportTickets', () => {
  it('maps server statuses', () => {
    expect(ticketStatus('OPEN')).toBe('open');
    expect(ticketStatus('IN_PROGRESS')).toBe('in_progress');
    expect(ticketStatus('CLOSED')).toBe('resolved');
  });
  it('tolerates non-array payloads', () => {
    expect(asTickets(null)).toEqual([]);
    expect(asFaqs({})).toEqual([]);
  });
  it('picks FAQ language with fallback', () => {
    const f = asFaqs([{ id: '1', question: 'س', answer: 'ج', question_en: null, answer_en: null }])[0];
    expect(faqText(f, false)).toEqual({ q: 'س', a: 'ج' });
  });
  it('serverMessage prefers server text', () => {
    expect(serverMessage({ response: { data: { message: ['bad'] } } }, 'x')).toBe('bad');
    expect(serverMessage(new Error('n'), 'x')).toBe('x');
  });
});
