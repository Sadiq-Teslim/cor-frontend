// User API Service
import apiClient from './client';
import type { User, OnboardingData, LanguageCode } from './types';

interface OnboardUserRequest {
  name: string;
  age: number;
  biologicalSex: 'male' | 'female' | 'other';
  preferredLanguage: LanguageCode;
  hasHypertension?: string;
  medications?: string;
  smokes?: boolean;
  drinksAlcohol?: boolean;
  activityLevel?: 'low' | 'moderate' | 'high';
  averageSleepHours?: number;
  smartwatchConnected?: boolean;
  smartwatchType?: 'apple' | 'google' | 'samsung' | 'fitbit';
  answers?: Record<string, any>;
}

export const userApi = {
  // Create new user with onboarding data
  async onboard(data: OnboardUserRequest): Promise<{ user: User }> {
    return apiClient.post('/api/users/onboard', data);
  },

  // Get user by ID
  async getUser(userId: string): Promise<{ user: User }> {
    return apiClient.get(`/api/users/${userId}`);
  },

  // Update user profile
  async updateUser(userId: string, data: Partial<User>): Promise<{ user: User }> {
    return apiClient.put(`/api/users/${userId}`, data);
  },

  // Save onboarding answer
  async saveOnboardingAnswer(userId: string, questionKey: string, answer: any): Promise<void> {
    return apiClient.post('/api/onboarding/answer', {
      userId,
      questionKey,
      answer,
    });
  },

  // Get all onboarding answers
  async getOnboardingAnswers(userId: string): Promise<{ answers: Array<{ questionKey: string; answer: any; rawAnswer: any }> }> {
    return apiClient.get(`/api/onboarding/answers?userId=${userId}`);
  },
};

export default userApi;
