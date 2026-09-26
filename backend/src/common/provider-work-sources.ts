/**
 * Where each provider type's work lives, for the provider home stats and the provider CRM.
 * Every entry is verified by a live journey (tools/live/j_<type>.py); provider_requests stays the
 * fallback for types whose flow writes the generic request model.
 */
export interface ProviderWorkSource {
  collection: string;
  providerField: string;
  patientField: string;
  stateField: string;
  amountField: string;
  pending: string[];
  inProgress: string[];
  done: string[];
}

export const PROVIDER_WORK_SOURCES: Record<string, ProviderWorkSource> = {
  // labs.service: book() / transition() / uploadReport()
  lab: {
    collection: 'labbookings', providerField: 'provider_account_id', patientField: 'patient_id', stateField: 'state', amountField: 'total',
    pending: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'],
    inProgress: ['CONFIRMED', 'IN_TRANSIT', 'IN_LAB', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_UPLOADED'],
    done: ['REPORTED'],
  },
  // radiology.service: book() / transition() / checkin / startScan / uploadReport / approveReport
  radiology: {
    collection: 'radiologybookings', providerField: 'provider_account_id', patientField: 'patient_id', stateField: 'state', amountField: 'total',
    pending: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'],
    inProgress: ['CONFIRMED', 'ARRIVED_CHECKIN', 'IN_SCANNING', 'REPORT_DRAFT', 'UNDER_REVIEW', 'SCAN_ABORTED'],
    done: ['REPORT_READY'],
  },
};
