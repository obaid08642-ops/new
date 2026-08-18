import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface SessionState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: SessionState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = sessionSlice.actions;
export default sessionSlice.reducer;
