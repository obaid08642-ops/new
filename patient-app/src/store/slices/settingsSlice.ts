import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AsyncEntityState, LoadingState } from '../types';

interface SettingsState extends AsyncEntityState<any> {
  // Define module specific state here
}

const initialState: SettingsState = {
  data: null,
  loading: LoadingState.IDLE,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    reset: () => initialState,
    // Add reducers here following naming conventions
  },
});

export const { reset } = settingsSlice.actions;
export default settingsSlice.reducer;
