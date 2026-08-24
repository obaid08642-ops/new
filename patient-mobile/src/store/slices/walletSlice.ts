import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface WalletState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: WalletState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = walletSlice.actions;
export default walletSlice.reducer;
