/** D-26: the owner's cancellation and refund table; `system_configs {key:'refund_policy'}` overrides it. */
export const DEFAULT_REFUND_POLICY = {
  consultation: { full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0, free_reschedules: 1, free_reschedule_min_hours: 2 },
  home_visit: { trip_fee_sar: 40, patient_absent_percent: 0 },
  pharmacy: { refund_delivery_fee_before_dispatch: true },
};
