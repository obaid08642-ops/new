import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { mentalHealthT } from '../src/i18n/mental-health';

// Boundaries only: the API, navigation, app context and the phone dialer. The view's own logic runs for real.
const mockApiFetch = jest.fn();
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: any[]) => mockApiFetch(...a) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/context/AppContext', () => {
  const colors = new Proxy({}, { get: () => '#111111' });
  return { useApp: () => ({ colors, lang: 'ar' }) };
});

import CrisisContactsView from '../src/components/views/CrisisContactsView';

const t = (k: any) => mentalHealthT('ar', k);
let openURL: jest.SpyInstance;
beforeEach(() => {
  mockApiFetch.mockReset();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
});

describe('CrisisContactsView (patient app, mental health → crisis contacts)', () => {
  it('lists saved contacts and dials the emergency numbers (911, 937)', async () => {
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [{ id: 'c1', contact_name: 'أخي', phone: '+966 50-123 4567', relationship: 'أخ' }] });
    await render(<CrisisContactsView />);
    expect(await screen.findByText('أخي')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith('/mental-health/crisis-contacts');
    await fireEvent.press(screen.getByText(t('emergencyCall')));
    expect(openURL).toHaveBeenLastCalledWith('tel:911');
    await fireEvent.press(screen.getByText(t('saudi937')));
    expect(openURL).toHaveBeenLastCalledWith('tel:937');
  });

  it('refuses an empty contact, then saves a filled one (trimmed) and reloads the list', async () => {
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [] });
    await render(<CrisisContactsView />);
    expect(await screen.findByText(t('noContacts'))).toBeTruthy();
    await fireEvent.press(screen.getByText(t('addContact')));
    await fireEvent.press(screen.getByText(t('add')));
    expect(screen.getByText(t('contactError'))).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);   // nothing was sent

    await fireEvent.changeText(screen.getByPlaceholderText(t('contactName')), '  سارة ');
    await fireEvent.changeText(screen.getByPlaceholderText(t('contactPhone')), ' 0551234567 ');
    mockApiFetch.mockResolvedValueOnce({ id: 'c2' });                                      // POST
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [{ id: 'c2', contact_name: 'سارة', phone: '0551234567' }] }); // reload
    await fireEvent.press(screen.getByText(t('add')));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/mental-health/crisis-contacts', expect.objectContaining({ method: 'POST' })));
    const body = JSON.parse(mockApiFetch.mock.calls.find((c) => c[1]?.method === 'POST')[1].body);
    expect(body).toEqual({ contact_name: 'سارة', phone: '0551234567' });
    expect(await screen.findByText('سارة')).toBeTruthy();
  });

  it('refuses a phone that cannot be dialled (Q2) without calling the API', async () => {
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [] });
    await render(<CrisisContactsView />);
    await screen.findByText(t('noContacts'));
    await fireEvent.press(screen.getByText(t('addContact')));
    await fireEvent.changeText(screen.getByPlaceholderText(t('contactName')), 'سارة');
    await fireEvent.changeText(screen.getByPlaceholderText(t('contactPhone')), 'abc');
    await fireEvent.press(screen.getByText(t('add')));
    expect(screen.getByText(t('contactError'))).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);   // only the initial list load
  });

  it('keeps the form open with an error when the save fails', async () => {
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [] });
    await render(<CrisisContactsView />);
    await screen.findByText(t('noContacts'));
    await fireEvent.press(screen.getByText(t('addContact')));
    await fireEvent.changeText(screen.getByPlaceholderText(t('contactName')), 'سارة');
    await fireEvent.changeText(screen.getByPlaceholderText(t('contactPhone')), '0551234567');
    mockApiFetch.mockRejectedValueOnce(new Error('400'));
    await fireEvent.press(screen.getByText(t('add')));
    expect(await screen.findByText(t('contactError'))).toBeTruthy();
    expect(screen.getByPlaceholderText(t('contactName')).props.value).toBe('سارة');
  });

  it('deletes a contact through the API and reloads', async () => {
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [{ id: 'c1', contact_name: 'أخي', phone: '0550000000' }] });
    await render(<CrisisContactsView />);
    await screen.findByText('أخي');
    mockApiFetch.mockResolvedValueOnce({});                       // DELETE
    mockApiFetch.mockResolvedValueOnce({ user_contacts: [] });     // reload
    await fireEvent.press(screen.getByLabelText(t('delete')));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/mental-health/crisis-contacts/c1', { method: 'DELETE' }));
    expect(await screen.findByText(t('noContacts'))).toBeTruthy();
  });
});
