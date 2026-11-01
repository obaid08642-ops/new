import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ContractModal, reachedEnd } from '../ContractModal';
import { ContractGate } from '../ContractGate';
import { contractErrorKey } from '../MyContract';
import { emitAgreementRequired, errorCode, submitErrorKey } from '../../utils/contractEvents';

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) } }));
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  const { translate } = require('../../i18n');
  const lang = { lang: 'en', isRTL: false, t: (key: string, params?: Record<string, string | number>) => translate('en', key, params) };
  return { useTheme: () => ({ theme, isDark: false }), useLang: () => lang, useToast: () => ({ show: jest.fn() }) };
});
jest.mock('../icons', () => ({ I: () => null }));

const POLICY = { data: { content: 'Article 1. The provider agrees.', version: '2.0', effective_date: '2026-11-01' } };
const scrollTo = (el: any, y: number, h = 300, content = 1000) =>
  fireEvent.scroll(el, { nativeEvent: { contentOffset: { y }, layoutMeasurement: { height: h }, contentSize: { height: content } } });

beforeEach(() => { mockGet.mockReset(); mockPost.mockReset(); });

describe('reading the end of the contract', () => {
  it('reachedEnd is true only near the bottom', () => {
    const ev = (y: number) => ({ contentOffset: { y }, layoutMeasurement: { height: 300 }, contentSize: { height: 1000 } }) as any;
    expect(reachedEnd(ev(0))).toBe(false);
    expect(reachedEnd(ev(600))).toBe(false);
    expect(reachedEnd(ev(690))).toBe(true);
  });
});

describe('ContractModal', () => {
  it('shows the server text and version, and keeps "I Agree" off until the end is reached', async () => {
    mockGet.mockResolvedValue(POLICY);
    await render(<ContractModal visible onClose={() => {}} />);
    expect(await screen.findByText('Article 1. The provider agrees.')).toBeTruthy();
    expect(screen.getByText('Version 2.0')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledWith('/legal/policy/provider_agreement?lang=en');
    const agree = screen.getByText('I Agree');
    await fireEvent.press(agree);
    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.getByText('Read the contract to the end to enable the agree button')).toBeTruthy();
  });

  it('records the acceptance after the end is reached, returns the version and closes', async () => {
    mockGet.mockResolvedValue(POLICY);
    mockPost.mockResolvedValue({ data: { ok: true, version: '2.0' } });
    const onAccepted = jest.fn(); const onClose = jest.fn();
    await render(<ContractModal visible onClose={onClose} onAccepted={onAccepted} />);
    await screen.findByText('Article 1. The provider agrees.');
    const scroller = screen.getByTestId('contract-scroll');
    await act(async () => { scrollTo(scroller, 700); });
    await fireEvent.press(screen.getByText('I Agree'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/legal/accept/provider_agreement', {}));
    await waitFor(() => expect(onAccepted).toHaveBeenCalledWith('2.0'));
    expect(onClose).toHaveBeenCalled();
  });

  it('a failed acceptance is shown and the contract stays open', async () => {
    mockGet.mockResolvedValue(POLICY);
    mockPost.mockRejectedValue(new Error('network'));
    const onAccepted = jest.fn(); const onClose = jest.fn();
    await render(<ContractModal visible onClose={onClose} onAccepted={onAccepted} />);
    await screen.findByText('Article 1. The provider agrees.');
    await act(async () => { scrollTo(screen.getByTestId('contract-scroll'), 700); });
    await fireEvent.press(screen.getByText('I Agree'));
    expect(await screen.findByText('Your agreement could not be recorded. Try again.')).toBeTruthy();
    expect(onAccepted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a text that cannot be loaded says so, offers a retry and has no agree path; no other text is shown', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(POLICY);
    await render(<ContractModal visible onClose={() => {}} />);
    expect(await screen.findByText('Could not load the contract text. Check your connection and try again.')).toBeTruthy();
    expect(screen.queryByText(/Commitment to Medical Standards/)).toBeNull();
    await fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Article 1. The provider agrees.')).toBeTruthy();
  });

  it('an unpublished agreement is reported, not replaced by a made-up text', async () => {
    mockGet.mockResolvedValue({ data: null });
    await render(<ContractModal visible onClose={() => {}} />);
    expect(await screen.findByText('The contract text is not published yet. Contact support.')).toBeTruthy();
  });
});

describe('ContractGate (a new version must be accepted again)', () => {
  it('opens the contract, with no close button, when the agreement is pending', async () => {
    mockGet.mockImplementation(async (url: string) => (url === '/legal/pending' ? { data: [{ key: 'provider_agreement', version: '2.0' }] } : POLICY));
    await render(<ContractGate />);
    expect(await screen.findByText('Service Provision Contract')).toBeTruthy();
    expect(screen.queryByLabelText('Close')).toBeNull();
  });
  it('shows nothing when the provider has accepted the current version', async () => {
    mockGet.mockResolvedValue({ data: [{ key: 'patient_terms' }] });
    await render(<ContractGate />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/legal/pending'));
    expect(screen.queryByText('Service Provision Contract')).toBeNull();
  });
});

describe('the signed contract errors', () => {
  it('maps what the server said to a message', () => {
    expect(contractErrorKey(403)).toBe('contract.mine.notShared');
    expect(contractErrorKey(404)).toBe('contract.mine.notReady');
    expect(contractErrorKey(500)).toBe('contract.mine.failed');
    expect(contractErrorKey(undefined)).toBe('contract.mine.failed');
  });
});

describe('the server refuses with a typed code', () => {
  it('a 403 provider_agreement_required makes the gate ask again and open the contract', async () => {
    let pending = false;
    mockGet.mockImplementation(async (url: string) => (url === '/legal/pending' ? { data: pending ? [{ key: 'provider_agreement' }] : [] } : POLICY));
    await render(<ContractGate />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/legal/pending'));
    expect(screen.queryByText('Service Provision Contract')).toBeNull();
    pending = true;
    await act(async () => { emitAgreementRequired(); });
    expect(await screen.findByText('Service Provision Contract')).toBeTruthy();
  });
  it('the submit codes map to a message', () => {
    expect(errorCode({ response: { data: { code: 'signature_pending_scan' } } })).toBe('signature_pending_scan');
    expect(errorCode({ response: { data: { message: 'signature_unusable' } } })).toBe('signature_unusable');
    expect(errorCode(new Error('x'))).toBeNull();
    expect(submitErrorKey('signature_pending_scan')).toBe('contract.signaturePending');
    expect(submitErrorKey('signature_unusable')).toBe('contract.signatureUnusable');
    expect(submitErrorKey('provider_agreement_not_published')).toBe('contract.notPublished');
    expect(submitErrorKey('provider_agreement_not_accepted')).toBe('contract.mustAccept');
    expect(submitErrorKey('something_else')).toBeNull();
  });
});
