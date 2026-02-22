// Voice API Service
import apiClient from './client';
import type { TranscriptionResponse, VoiceResponse } from './types';

export const voiceApi = {
  // Transcribe audio to text
  async transcribe(audio: File): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audio);
    return apiClient.postFormData('/api/voice/transcribe', formData);
  },

  // Generate AI health response
  async respond(
    transcript: string,
    language: string,
    userId?: string,
    healthContext?: object
  ): Promise<VoiceResponse> {
    return apiClient.post('/api/voice/respond', {
      transcript,
      language,
      userId,
      healthContext,
    });
  },

  // Convert text to speech - returns audio Blob
  async speak(text: string, language: string): Promise<Blob> {
    return apiClient.postForBlob('/api/voice/speak', { text, language });
  },
};

export default voiceApi;
