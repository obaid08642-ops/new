// Centralized event names. Use these constants — never raw strings.
export const EVENTS = {
  // User
  USER_REGISTERED: 'user.registered',
  USER_ROLE_ASSIGNED: 'user.role_assigned',
  USER_LOGGED_IN: 'user.logged_in',
  USER_GUEST_CONVERTED: 'user.guest_converted',
  // Order
  ORDER_CREATED: 'order.created',
  ORDER_VALIDATED: 'order.validated',
  ORDER_RECEIVED_BY_PHARMACY: 'order.pharmacy_received',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_REJECTED: 'order.rejected',
  ORDER_PREPARING: 'order.preparing',
  ORDER_READY: 'order.ready',
  ORDER_ASSIGNED: 'order.assigned_to_delivery',
  ORDER_OUT_FOR_DELIVERY: 'order.out_for_delivery',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_ESCALATED: 'order.escalated',
  ORDER_PARTIAL: 'order.partially_fulfilled',
  // Prescription
  PRESCRIPTION_CREATED: 'prescription.created',
  PRESCRIPTION_MANUAL_ENTRY: 'prescription.manual_entry_created',
  PRESCRIPTION_SENT: 'prescription.sent_to_pharmacy',
  PRESCRIPTION_MODIFIED: 'prescription.modified',
  PRESCRIPTION_DISPENSED: 'prescription.dispensed',
  // Medicine (Master DB)
  MEDICINE_PENDING_REVIEW: 'medicine.pending_review',
  MEDICINE_APPROVED: 'medicine.approved',
  MEDICINE_REJECTED: 'medicine.rejected',
  // Medication tracking
  MEDICATION_REMINDER_FIRED: 'medication.reminder_fired',
  MEDICATION_TAKEN: 'medication.taken',
  MEDICATION_MISSED: 'medication.missed',
  // Emergency
  EMERGENCY_TRIGGERED: 'emergency.triggered',
  EMERGENCY_ASSIGNED: 'emergency.assigned',
  EMERGENCY_RESOLVED: 'emergency.resolved',
  // Delivery
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_UPDATED: 'delivery.updated',
  DELIVERY_FAILED: 'delivery.failed',
  // Notifications
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
