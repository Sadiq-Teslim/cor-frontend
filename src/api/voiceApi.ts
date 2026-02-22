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

  // Get pre-generated audio file (onboarding, instructions, confirmations)
  async getPregeneratedAudio(
    category: 'onboarding' | 'instructions' | 'confirmations',
    language: string,
    filename: string,
  ): Promise<Blob> {
    const response = await fetch(
      `https://cor-api.onrender.com/api/audio/${category}/${language}/${filename}`,
    );
    if (!response.ok) {
      let errorMessage = `Failed to fetch ${category} audio file: ${filename}`;
      try {
        const data = await response.json();
        errorMessage = data.error?.message || errorMessage;
      } catch {
        // If response is not JSON, use HTTP status
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    return response.blob();
  },
};

export default voiceApi;
