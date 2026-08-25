# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/notificationsSlice.ts`
- **Member SHA-256:** `a8812223db6216df04b9a47afeffb4d2461b752349acc0a8a8d2b0d74f5b488a`
- **Line count:** 43
- **Read range:** `1-43`
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
- `12: interface NotificationsState {`
- `19: initialState: { items: [], unreadCount: 0 } as NotificationsState,`
- `21: setNotifications: (state, action: PayloadAction<AppNotification[]>) => {`
- `22: state.items = action.payload;`
- `23: state.unreadCount = action.payload.filter((n) => !n.isRead).length;`
- `25: addNotification: (state, action: PayloadAction<AppNotification>) => {`
- `26: state.items.unshift(action.payload);`
- `27: if (!action.payload.isRead) state.unreadCount += 1;`
- `29: markAsRead: (state, action: PayloadAction<string>) => {`
- `30: const n = state.items.find((n) => n.id === action.payload);`
- `33: state.unreadCount = Math.max(0, state.unreadCount - 1);`
- `36: markAllAsRead: (state) => {`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
- `21: setNotifications: (state, action: PayloadAction<AppNotification[]>) => {`
- `22: state.items = action.payload;`
- `23: state.unreadCount = action.payload.filter((n) => !n.isRead).length;`
- `25: addNotification: (state, action: PayloadAction<AppNotification>) => {`
- `26: state.items.unshift(action.payload);`
- `27: if (!action.payload.isRead) state.unreadCount += 1;`
- `29: markAsRead: (state, action: PayloadAction<string>) => {`
- `30: const n = state.items.find((n) => n.id === action.payload);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
