import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, initNotificationListeners } from '../utils/notifications';
import { displayNativeIncomingCall } from '../utils/callkeep';
import { flushMedicationDoseActions, medicationNotificationAction, recordMedicationDoseAction, snoozeMedicationNotificationResponse } from '../utils/medication-notifications';
import { HttpClient } from '@/services/HttpClient';

/** Report engagement to the backend → powers admin open-rate / CTR analytics. */
function trackEngagement(event: 'received' | 'opened' | 'clicked', data: any): void {
  if (!data) return;
  HttpClient.post('/push/events', {
    event,
    notification_id: data?.notification_id,
    campaign_id: data?.campaign_id,
    data: { type: data?.type },
  }).catch(() => { /* analytics must never break UX */ });
}

/**
 * M6 / ER-8 + ER-12: every notification must open its exact destination
 * screen — even when the app is terminated.
 * Contract: backend pushes data = { type, ...legacy } OR the generic
 * { screen: '/route/path', params: {...} } which takes precedence.
 * Screens are whitelisted below to prevent open-redirect navigation.
 */
const ALLOWED_SCREENS = new Set([
  '/consultations/appointments',
  '/consultations/appointment-detail',
  '/consultations/booking-status',
  '/consultations/chat-with-doctor',
  '/consultations/virtual-waiting-room',
  '/consultations/summary',
  '/consultations/clinic-confirm',
  '/consultations/prescription-from-doctor',
  '/consultations/follow-up',
  '/pharmacy/order-tracking',
  '/pharmacy/cart',
  '/diagnostics/orders',
  '/diagnostics/my-results',
  '/emergency/sos-active',
  '/insurance',
  '/returns/hub',
  '/notifications',
  '/loyalty',
  '/offers',
  '/health/medication-reminder-list',
]);

// Legacy type → screen resolver (kept for backward compatibility)
function resolveLegacyRoute(data: any): { pathname: string; params: Record<string, any> } | null {
  switch (data?.type) {
    case 'chat':
      return { pathname: '/consultations/chat-with-doctor', params: { doctorId: data.senderId, doctorName: data.senderName } };
    case 'prescription':
      return { pathname: '/consultations/prescription-from-doctor', params: { prescriptionId: data.prescriptionId, doctorId: data.doctorId } };
    case 'order':
      return { pathname: '/pharmacy/order-tracking', params: { orderId: data.orderId } };
    case 'consultation':
      return data.bookingId
        ? { pathname: '/consultations/appointment-detail', params: { id: data.bookingId } }
        : { pathname: '/consultations/appointments', params: {} };
    // M6 additions
    case 'booking_accepted':
      return { pathname: '/consultations/booking-status', params: { appointmentId: data.appointmentId, visitType: data.visitType } };
    case 'insurance_decision':
    case 'copay_due':
      return { pathname: '/insurance', params: { requestId: data.requestId } };
    case 'report_ready':
      return { pathname: '/diagnostics/my-results', params: {} };
    case 'emergency_update':
      return { pathname: '/emergency/sos-active', params: {} };
    case 'refund_status':
      return { pathname: '/returns/hub', params: {} };
    default:
      return null;
  }
}

export default function NotificationHandler() {
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register token with backend and reconcile explicit local medication actions.
    registerForPushNotificationsAsync();
    flushMedicationDoseActions().catch(() => { /* a later app launch will retry */ });

    const navigateFromData = (data: any) => {
      if (!data) return;
      if (data.type === 'incoming_call' || data.type === 'call') {
        displayNativeIncomingCall(data.session_id || data.sessionId, data.caller_name || data.callerName || 'طبيب نبض', (data.call_type || data.callType) !== 'voice');
        return;
      }
      // Generic contract wins
      if (typeof data.screen === 'string' && ALLOWED_SCREENS.has(data.screen)) {
        router.push({ pathname: data.screen as any, params: (data.params as any) || {} });
        return;
      }
      const legacy = resolveLegacyRoute(data);
      if (legacy) {
        router.push({ pathname: legacy.pathname as any, params: legacy.params });
        return;
      }
      // Safe fallback: notifications center
      router.push('/notifications' as any);
    };

    // App launched by tapping a notification (terminated state)
    Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (response) {
        const data = response.notification.request.content.data;
        const medicationAction = medicationNotificationAction(response);
        if (medicationAction.action === 'taken' && medicationAction.reminderId && medicationAction.timeKey) {
          await recordMedicationDoseAction(medicationAction.reminderId, medicationAction.timeKey, 'taken').catch(() => { /* local queue persists the explicit action */ });
        }
        if (medicationAction.action === 'snooze') {
          await snoozeMedicationNotificationResponse(response).catch(() => { /* original reminder remains visible if scheduling fails */ });
        }
        trackEngagement('opened', data);
        trackEngagement('clicked', data);
        navigateFromData(data);
      }
    });

    const handleNotificationClick = async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const medicationAction = medicationNotificationAction(response);
      if (medicationAction.action === 'taken' && medicationAction.reminderId && medicationAction.timeKey) {
        await recordMedicationDoseAction(medicationAction.reminderId, medicationAction.timeKey, 'taken').catch(() => { /* local queue persists the explicit action */ });
      }
      if (medicationAction.action === 'snooze') {
        await snoozeMedicationNotificationResponse(response).catch(() => { /* original reminder remains visible if scheduling fails */ });
      }
      trackEngagement('opened', data);
      trackEngagement('clicked', data);
      navigateFromData(data);
    };

    const handleForegroundNotification = (notification: Notifications.Notification) => {
      const data = notification.request.content.data as any;
      trackEngagement('received', data);
      if (data && (data.type === 'incoming_call' || data.type === 'call')) {
        displayNativeIncomingCall(data.session_id || data.sessionId, data.caller_name || data.callerName || 'طبيب نبض', (data.call_type || data.callType) !== 'voice');
      }
    };

    // Listen to notification events
    const unsubscribe = initNotificationListeners(
      handleForegroundNotification,
      handleNotificationClick
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  return null;
}
