import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OtpModal } from '../OtpModal';

// The modal reads theme + language from the app context; give it the real shape without the providers.
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => '#0B1B2B' });
  return { useTheme: () => ({ theme, isDark: false }), useLang: () => ({ lang: 'ar', setLang: jest.fn() }) };
});

// The code boxes have no testID/label; find the six host TextInputs under the rendered root.
let root: any;
const show = async (ui: React.ReactElement) => { root = (await render(ui)).root; };
const boxes = () => root.queryAll((n: any) => n.type === 'TextInput');

describe('OtpModal (provider sign-up / email verification)', () => {
  it('pasting the full code fills all six boxes and a correct code closes the modal', async () => {
    const onVerify = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();
    await show(<OtpModal visible onClose={onClose} onVerify={onVerify} target="dr@nabd.test" />);
    expect(boxes()).toHaveLength(6);
    await fireEvent.changeText(boxes()[0], '123456');
    expect(boxes().map((b) => b.props.value).join('')).toBe('123456');
    await fireEvent.press(screen.getByText('تأكيد الرمز'));
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('123456'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('a wrong code shows the error and keeps the modal open', async () => {
    const onVerify = jest.fn().mockResolvedValue(false);
    const onClose = jest.fn();
    await show(<OtpModal visible onClose={onClose} onVerify={onVerify} target="dr@nabd.test" />);
    await fireEvent.changeText(boxes()[0], '999999');
    await fireEvent.press(screen.getByText('تأكيد الرمز'));
    expect(await screen.findByText('رمز التحقق غير صحيح')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores non-digits and does not verify an incomplete code', async () => {
    const onVerify = jest.fn();
    await show(<OtpModal visible onClose={jest.fn()} onVerify={onVerify} target="x" />);
    await fireEvent.changeText(boxes()[1], 'a');
    expect(boxes()[1].props.value).toBe('');
    await fireEvent.changeText(boxes()[0], '12');
    expect(boxes().map((b) => b.props.value).join('')).toBe('12');
    await fireEvent.press(screen.getByText('تأكيد الرمز'));   // button is disabled below 6 digits
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('shows the server error message when verification throws', async () => {
    const onVerify = jest.fn().mockRejectedValue(new Error('otp_expired'));
    await show(<OtpModal visible onClose={jest.fn()} onVerify={onVerify} target="x" />);
    await fireEvent.changeText(boxes()[0], '123456');
    await fireEvent.press(screen.getByText('تأكيد الرمز'));
    expect(await screen.findByText('otp_expired')).toBeTruthy();
  });

  it('resend calls the handler', async () => {
    const onResend = jest.fn();
    await show(<OtpModal visible onClose={jest.fn()} onVerify={jest.fn()} target="x" onResend={onResend} />);
    await fireEvent.press(screen.getByText('إعادة إرسال الرمز'));
    expect(onResend).toHaveBeenCalledTimes(1);
  });
});
