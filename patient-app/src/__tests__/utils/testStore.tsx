import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import authReducer from '../../store/slices/authSlice';
import notificationsReducer from '../../store/slices/notificationsSlice';

/** A real store with the two slices the sign-in and notification screens use, for tests that render them. */
export function makeStore() {
  return configureStore({ reducer: { auth: authReducer, notifications: notificationsReducer } });
}

export type TestStore = ReturnType<typeof makeStore>;

export function withStore(ui: React.ReactElement, store: TestStore = makeStore()) {
  return <Provider store={store}>{ui}</Provider>;
}
