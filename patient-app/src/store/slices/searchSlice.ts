import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface SearchState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: SearchState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = searchSlice.actions;
export default searchSlice.reducer;
