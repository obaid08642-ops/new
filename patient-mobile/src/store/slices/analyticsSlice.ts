import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface AnalyticsState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: AnalyticsState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = analyticsSlice.actions;
export default analyticsSlice.reducer;
