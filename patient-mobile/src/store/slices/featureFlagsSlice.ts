import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface FeatureFlagsState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: FeatureFlagsState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const featureFlagsSlice = createSlice({
  name: 'featureFlags',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = featureFlagsSlice.actions;
export default featureFlagsSlice.reducer;
