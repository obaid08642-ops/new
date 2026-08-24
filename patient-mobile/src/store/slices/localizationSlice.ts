import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface LocalizationState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: LocalizationState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const localizationSlice = createSlice({
  name: 'localization',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = localizationSlice.actions;
export default localizationSlice.reducer;
