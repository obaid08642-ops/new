import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface OrdersState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: OrdersState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = ordersSlice.actions;
export default ordersSlice.reducer;
