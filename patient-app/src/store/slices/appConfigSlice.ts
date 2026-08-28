import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface AppConfigState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: AppConfigState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = appConfigSlice.actions;
export default appConfigSlice.reducer;
