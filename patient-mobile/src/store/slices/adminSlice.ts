import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface AdminState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: AdminState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = adminSlice.actions;
export default adminSlice.reducer;
