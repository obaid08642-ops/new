import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { AppHeader, ErrorState, Screen } from '../../../packages/ui-native/src';
import { COLUMN, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { readThreadBooking } from '../../src/chat/threadLink';

/**
 * A shared web chat link (https://nabd.plus/<locale>/chat/<threadId>) opens here (PT-38). A thread id is not an appointment
 * id, so the screen asks the server which booking the thread belongs to (GET /chat/threads/:id/permissions answers
 * `booking_id`) and goes on to the conversation of that booking, the same screen a push opens. Nothing about the thread is
 * shown here; when the server does not know it (no access, not found, offline) the patient gets the error with a retry and
 * the way to the appointments, never a blank screen.
 */
export default function ChatLinkRoute() {
  const { theme, dir, k } = useScreenUi();
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const raw = Array.isArray(params.threadId) ? params.threadId[0] : params.threadId;
  const threadId = raw && /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : null;
  const [failed, setFailed] = useState(threadId === null);
  const alive = useRef(true);

  const resolve = useCallback(() => {
    if (!threadId) return;
    setFailed(false);
    apiFetch<unknown>(`/chat/threads/${encodeURIComponent(threadId)}/permissions`)
      .then((answer) => {
        if (!alive.current) return;
        const bookingId = readThreadBooking(answer);
        if (!bookingId) {
          setFailed(true);
          return;
        }
        router.replace({ pathname: '/consultations/chat-with-doctor', params: { appointmentId: bookingId } } as unknown as Href);
      })
      .catch((error) => {
        logError('consultations:chat-link', error);
        if (alive.current) setFailed(true);
      });
  }, [threadId]);

  useEffect(() => {
    alive.current = true;
    resolve();
    return () => {
      alive.current = false;
    };
  }, [resolve]);

  const toAppointments = () => router.replace('/consultations/appointments' as Href);
  return (
    <Screen
      theme={theme}
      direction={dir}
      header={<View style={COLUMN}><AppHeader title={k('consult.chat.title')} onBack={() => (router.canGoBack() ? router.back() : toAppointments())} backLabel={k('common.back')} theme={theme} direction={dir} /></View>}
      testID="chat-link-screen"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1, justifyContent: 'center', gap: 16 }}>
        {failed ? (
          <ErrorState title={k('consult.error.title')} body={k('consult.chat.openFailed')} retryLabel={k('common.retry')} onRetry={threadId ? resolve : undefined} actionLabel={k('consult.appt.title')} onAction={toAppointments} theme={theme} />
        ) : (
          <ActivityIndicator accessibilityLabel={k('common.loading')} />
        )}
      </View>
    </Screen>
  );
}
