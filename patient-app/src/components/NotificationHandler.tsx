import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, initNotificationListeners } from '../utils/notifications';
import { displayNativeIncomingCall } from '../utils/callkeep';

export default function NotificationHandler() {
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register token with backend
    registerForPushNotificationsAsync();

    // Check if the app was launched by clicking a notification
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        handleNotificationClick(response);
      }
    });

    const handleNotificationClick = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as any;
      if (data && data.type === 'incoming_call') {
        displayNativeIncomingCall(data.sessionId, data.callerName || 'طبيب نبض', data.callType !== 'voice');
      } else if (data && data.type === 'chat') {
        router.push({
          pathname: '/consultations/chat-with-doctor' as any,
          params: {
            doctorId: data.senderId,
            doctorName: data.senderName,
          },
        });
      } else if (data && data.type === 'prescription') {
        router.push({
          pathname: '/consultations/prescription-from-doctor' as any,
          params: {
            prescriptionId: data.prescriptionId,
            doctorId: data.doctorId,
          },
        });
      } else if (data && data.type === 'order') {
        router.push({
          pathname: '/pharmacy/order-tracking' as any,
          params: {
            orderId: data.orderId,
          },
        });
      } else if (data && data.type === 'consultation') {
        router.push({
          pathname: '/consultations/appointments' as any,
          params: {
            bookingId: data.bookingId,
          },
        });
      }
    };

    const handleForegroundNotification = (notification: Notifications.Notification) => {
      const data = notification.request.content.data as any;
      if (data && data.type === 'incoming_call') {
        displayNativeIncomingCall(data.sessionId, data.callerName || 'طبيب نبض', data.callType !== 'voice');
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
