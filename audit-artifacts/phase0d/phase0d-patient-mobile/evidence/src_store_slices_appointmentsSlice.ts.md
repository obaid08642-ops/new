# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/appointmentsSlice.ts`
- **Member SHA-256:** `d319b11c384d5e27b61d0686f3f958ce46be0bb5d19c69cefd00430a3b81a46f`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { Appointment, AppointmentStatus, AppointmentMode } from '../../types/contracts';`
- `4: interface AppointmentsState {`
- `7: isLoading: boolean;`
- `12: initialState: { upcoming: [], past: [], isLoading: false } as AppointmentsState,`
- `14: setUpcoming: (state, action: PayloadAction<Appointment[]>) => {`
- `15: state.upcoming = action.payload;`
- `17: setPast: (state, action: PayloadAction<Appointment[]>) => {`
- `18: state.past = action.payload;`
- `20: addAppointment: (state, action: PayloadAction<Appointment>) => {`
- `21: state.upcoming.unshift(action.payload);`
- `23: updateAppointment: (state, action: PayloadAction<Appointment>) => {`
- `24: const idx = state.upcoming.findIndex((a) => a.id === action.payload.id);`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
- `14: setUpcoming: (state, action: PayloadAction<Appointment[]>) => {`
- `15: state.upcoming = action.payload;`
- `17: setPast: (state, action: PayloadAction<Appointment[]>) => {`
- `18: state.past = action.payload;`
- `20: addAppointment: (state, action: PayloadAction<Appointment>) => {`
- `21: state.upcoming.unshift(action.payload);`
- `23: updateAppointment: (state, action: PayloadAction<Appointment>) => {`
- `24: const idx = state.upcoming.findIndex((a) => a.id === action.payload.id);`
- `25: if (idx !== -1) state.upcoming[idx] = action.payload;`
- `27: setLoading: (state, action: PayloadAction<boolean>) => {`
- `28: state.isLoading = action.payload;`
### error_empty_loading_retry_cancel
- `7: isLoading: boolean;`
- `12: initialState: { upcoming: [], past: [], isLoading: false } as AppointmentsState,`
- `27: setLoading: (state, action: PayloadAction<boolean>) => {`
- `28: state.isLoading = action.payload;`
- `32: export const { setUpcoming, setPast, addAppointment, updateAppointment, setLoading } = appointmentsSlice.actions;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
