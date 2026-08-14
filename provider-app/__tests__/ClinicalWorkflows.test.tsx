import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SickLeaveScreen, MedicalReportScreen, RequestTestScreen } from '../src/screens/doctor/DoctorDashboard';
import { ThemeProvider } from '../src/context';

jest.mock('../src/api/client', () => {
  const axios = require('axios');
  return axios.create();
});

const mockApt = { id: 'test_apt_1', patient_id: 'pat_1', patient: 'Test Patient' };

// Mocking useToast
jest.mock('../src/context', () => {
  const actual = jest.requireActual('../src/context');
  return {
    ...actual,
    useToast: () => ({ show: jest.fn() }),
    useLang: () => ({ lang: 'en' }),
    useTheme: () => ({
      theme: { bg: '#fff', text: '#000', primary: '#f00' }
    })
  };
});

describe('Clinical Workflows', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    const client = require('../src/api/client');
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    mock.reset();
  });

  afterAll(() => {
    mock.restore();
  });

  it('submits a Sick Leave correctly', async () => {
    mock.onPost('/provider/requests/test_apt_1/sick-leave').reply(200, { ok: true });

    const onBack = jest.fn();
    const { getByText, getByPlaceholderText } = await render(
      <SickLeaveScreen apt={mockApt} onBack={onBack} />
    ) as any;

    // Find the input and set diagnosis
    const diagInput = getByPlaceholderText('Medical reason for leave');
    await fireEvent.changeText(diagInput, 'Flu');

    // Submit
    const btn = getByText(' Issue & Send Sick Leave');
    await fireEvent.press(btn);

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe('/provider/requests/test_apt_1/sick-leave');
      expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
        patient_id: 'pat_1',
        diagnosis: 'Flu'
      });
    });
  });

  it('submits a Medical Report correctly', async () => {
    mock.onPost('/provider/requests/test_apt_1/medical-report').reply(200, { ok: true });

    const onBack = jest.fn();
    const { getByText, getByPlaceholderText } = await render(
      <MedicalReportScreen apt={mockApt} onBack={onBack} />
    ) as any;

    // Select type
    await fireEvent.press(getByText('General Medical Report'));
    
    // Set findings
    const findingsInput = getByPlaceholderText('State symptoms, examinations and findings...');
    await fireEvent.changeText(findingsInput, 'Patient is healthy');

    // Submit
    const btn = getByText(' Issue Medical Report');
    await fireEvent.press(btn);

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe('/provider/requests/test_apt_1/medical-report');
      expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
        patient_id: 'pat_1',
        type: 'General Medical Report',
        findings: 'Patient is healthy'
      });
    });
  });

  it('requests lab tests correctly', async () => {
    mock.onPost('/labs/bookings').reply(200, { ok: true });

    const onBack = jest.fn();
    const { getByText, getAllByText } = await render(
      <RequestTestScreen apt={mockApt} onBack={onBack} />
    ) as any;

    // Tap first test (e.g. CBC)
    await fireEvent.press(getByText('Complete Blood Count'));

    // Submit
    const btn = getByText(' Send Request');
    await fireEvent.press(btn);

    await waitFor(() => {
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe('/labs/bookings');
      expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
        patient_id: 'pat_1'
      });
    });
  });
});
