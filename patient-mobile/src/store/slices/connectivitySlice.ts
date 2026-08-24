import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface ConnectivityState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: ConnectivityState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = connectivitySlice.actions;
export default connectivitySlice.reducer;
