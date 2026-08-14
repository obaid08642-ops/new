import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../core/domain/entities/Users';
import { LoadingState } from '../types';

/**
 * Entity Adapter for Users
 * Normalizes the user collection { ids: [], entities: {} } for O(1) lookups
 * and high performance renders.
 */
export const usersAdapter = createEntityAdapter<User>({
  sortComparer: (a: User, b: User) => a.name.localeCompare(b.name),
});

const initialState = usersAdapter.getInitialState({
  loading: LoadingState.IDLE,
  error: null as string | null,
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    usersLoading: (state) => {
      state.loading = LoadingState.PENDING;
    },
    usersReceived: (state, action: PayloadAction<User[]>) => {
      state.loading = LoadingState.SUCCEEDED;
      usersAdapter.setAll(state, action.payload);
    },
    userAdded: usersAdapter.addOne,
    userUpdated: usersAdapter.updateOne,
    userRemoved: usersAdapter.removeOne,
    usersFailed: (state, action: PayloadAction<string>) => {
      state.loading = LoadingState.FAILED;
      state.error = action.payload;
    },
    reset: () => initialState,
  },
});

export const {
  usersLoading,
  usersReceived,
  userAdded,
  userUpdated,
  userRemoved,
  usersFailed,
  reset,
} = userSlice.actions;

export default userSlice.reducer;
