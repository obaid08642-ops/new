import {
  consumeRegistrationTransaction,
  createRegistrationTransaction,
} from './RegistrationTransaction';

describe('RegistrationTransaction', () => {
  it('keeps credentials outside navigation state and consumes them exactly once', () => {
    const id = createRegistrationTransaction({
      fullName: 'مريض اختبار', phone: '+966500000000', email: 'patient@example.test', password: 'StrongPass#1',
    });

    expect(id).toMatch(/^reg_/);
    expect(consumeRegistrationTransaction(id)).toEqual({
      fullName: 'مريض اختبار', phone: '+966500000000', email: 'patient@example.test', password: 'StrongPass#1',
    });
    expect(consumeRegistrationTransaction(id)).toBeNull();
  });
});
