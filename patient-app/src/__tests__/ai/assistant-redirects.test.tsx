import React from 'react';
import { act, render } from '@testing-library/react-native';

import AiAssistant from '../../../app/ai-assistant';
import ChatDoctor from '../../../app/ai/chat-doctor';
import PrescriptionTranslator from '../../../app/ai/prescription-translator';
import SymptomChecker from '../../../app/ai/symptom-checker';
import SymptomTimeline from '../../../app/ai/symptom-timeline';
import Triage from '../../../app/ai/triage';
import Voice from '../../../app/voice/index';
import { translateBackendRoute } from '../../hooks/usePushNotifications';

/** OD-7 route table: every old AI route lands on the one assistant (same modes as the web) and keeps the query it was opened with. */
const mockRedirect = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Redirect: (props: { href: unknown }) => {
    mockRedirect(props.href);
    return null;
  },
  useLocalSearchParams: () => mockParams,
}));

const table: Array<[string, React.ComponentType, string, Record<string, string>]> = [
  ['/ai-assistant', AiAssistant, '/ai', { mode: 'symptoms' }],
  ['/ai/triage', Triage, '/ai', { mode: 'symptoms' }],
  ['/ai/symptom-checker', SymptomChecker, '/ai', { mode: 'symptoms' }],
  ['/ai/symptom-timeline', SymptomTimeline, '/ai', { mode: 'symptoms' }],
  ['/ai/prescription-translator', PrescriptionTranslator, '/ai', { mode: 'prescription' }],
  ['/ai/chat-doctor', ChatDoctor, '/consultations/appointments', {}],
  ['/voice', Voice, '/ai', {}],
];

describe('old AI routes', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockParams = {};
  });

  it.each(table)('%s redirects', async (_old, Screen, pathname, params) => {
    await act(async () => { render(<Screen />); });
    expect(mockRedirect).toHaveBeenCalledWith({ pathname, params });
  });

  it('keeps an incoming query', async () => {
    mockParams = { source: 'push' };
    await act(async () => { render(<Triage />); });
    expect(mockRedirect).toHaveBeenCalledWith({ pathname: '/ai', params: { source: 'push', mode: 'symptoms' } });
  });

  it('push routes for the old paths land on the assistant', () => {
    expect(translateBackendRoute('/ai/symptom-timeline')).toEqual({ pathname: '/ai', params: { mode: 'symptoms' } });
  });
});
