import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface LoyaltyState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: LoyaltyState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = loyaltySlice.actions;
export default loyaltySlice.reducer;
