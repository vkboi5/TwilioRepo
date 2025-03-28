// app/src/store/voice/call/transcription.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TranscriptionState {
  [callId: string]: {
    transcript: string; // Full history with newlines
    latestTranscript: string; // Latest transcription only
    isDeafMode: boolean;
    detectedLanguage: string;
    currentLanguage: string;
  };
}

const initialState: TranscriptionState = {};

export const transcriptionSlice = createSlice({
  name: 'transcription',
  initialState,
  reducers: {
    updateTranscription(
      state,
      action: PayloadAction<{
        id: string;
        transcript: string;
        detectedLanguage?: string;
      }>,
    ) {
      const { id, transcript, detectedLanguage } = action.payload;
      if (!state[id]) {
        state[id] = {
          transcript: '',
          latestTranscript: '',
          isDeafMode: true,
          detectedLanguage: detectedLanguage || '',
          currentLanguage: 'hi-IN',
        };
      }
      // Only append if the new transcript differs from the latest
      if (state[id].latestTranscript !== transcript) {
        state[id].transcript += (state[id].transcript ? '\n' : '') + transcript;
        state[id].latestTranscript = transcript;
      }
      if (detectedLanguage) {
        state[id].detectedLanguage = detectedLanguage;
      }
    },
  },
});

export const { updateTranscription } = transcriptionSlice.actions;
export default transcriptionSlice.reducer;