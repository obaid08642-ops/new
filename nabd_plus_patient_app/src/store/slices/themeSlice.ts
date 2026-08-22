import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'system', language: 'ar' } as ThemeState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.mode = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'ar' | 'en'>) => {
      state.language = action.payload;
    },
  },
});
export const { setTheme, setLanguage } = themeSlice.actions;
export default themeSlice.reducer;
