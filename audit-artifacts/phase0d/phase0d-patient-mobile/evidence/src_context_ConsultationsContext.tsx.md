# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/context/ConsultationsContext.tsx`
- **Member SHA-256:** `00edc5e621e87da0926dc77fb8d0d4502b18bf951e4848767c20819c0f239f9b`
- **Line count:** 69
- **Read range:** `1-69`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `25: const res = await apiFetch('/care/appointments');`
### auth_ownership
- `11: fetchAppointments: (isRefresh?: boolean) => Promise<void>;`
- `21: const fetchAppointments = useCallback(async (isRefresh = false) => {`
- `23: if (!isRefresh) setIsLoading(true);`
### state_transitions
- `1: import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';`
- `4: import { Appointment, AppointmentStatus, AppointmentMode } from '../types/contracts';`
- `9: isLoading: boolean;`
- `10: error: boolean;`
- `17: const [appointments, setAppointments] = useState<Appointment[]>([]);`
- `18: const [isLoading, setIsLoading] = useState(true);`
- `19: const [error, setError] = useState(false);`
- `23: if (!isRefresh) setIsLoading(true);`
- `24: setError(false);`
- `37: status: a.status || 'pending',`
- `45: setError(true);`
- `48: setIsLoading(false);`
### payment_insurance_relevance
- `38: price: a.consultation_fee || a.price || 0,`
### error_empty_loading_retry_cancel
- `9: isLoading: boolean;`
- `10: error: boolean;`
- `18: const [isLoading, setIsLoading] = useState(true);`
- `19: const [error, setError] = useState(false);`
- `23: if (!isRefresh) setIsLoading(true);`
- `24: setError(false);`
- `37: status: a.status || 'pending',`
- `44: } catch (err) {`
- `45: setError(true);`
- `48: setIsLoading(false);`
- `57: <ConsultationsContext.Provider value={{ appointments, isLoading, error, fetchAppointments }}>`
- `66: throw new Error('useConsultations must be used within a ConsultationsProvider');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
