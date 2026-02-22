// Settings API Service
import apiClient from "./client";
import type { UserSettings, LanguageCode } from "./types";

export const settingsApi = {
  // Get user settings
  async getSettings(userId: string): Promise<UserSettings> {
    return apiClient.get(`/api/settings/${userId}`);
  },

  // Update user settings
  async updateSettings(
    userId: string,
    data: Partial<{
      language: LanguageCode;
      wakeWordEnabled: boolean;
      smartwatchConnected: boolean;
      smartwatchType: string;
      notificationsEnabled: boolean;
    }>,
  ): Promise<{ settings: UserSettings }> {
    return apiClient.put(`/api/settings/${userId}`, data);
  },
};

export default settingsApi;
