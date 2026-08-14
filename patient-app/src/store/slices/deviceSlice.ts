import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface DeviceState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: DeviceState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = deviceSlice.actions;
export default deviceSlice.reducer;
