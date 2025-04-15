// app/src/store/voice/call/languagePreferences.ts
import { createSlice } from '@reduxjs/toolkit';

export const languagePreferencesSlice = createSlice({
  name: 'languagePreferences',
  initialState: {
    preferredLanguage: 'en-US',
  },
  reducers: {
    setPreferredLanguage: (state, action) => {
      state.preferredLanguage = action.payload;
    },
  },
});

export const { setPreferredLanguage } = languagePreferencesSlice.actions;