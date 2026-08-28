import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface FavoritesState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: FavoritesState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = favoritesSlice.actions;
export default favoritesSlice.reducer;
