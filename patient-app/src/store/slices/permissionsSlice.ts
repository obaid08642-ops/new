import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface PermissionsState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: PermissionsState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = permissionsSlice.actions;
export default permissionsSlice.reducer;
