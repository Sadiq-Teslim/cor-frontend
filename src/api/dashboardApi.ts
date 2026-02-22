// Dashboard & Home API Service
import apiClient from "./client";
import type {
  HomeDashboardData,
  LifestyleInsights,
  TrendsResponse,
  DailyTip,
  UserSettings,
} from "./types";

export const dashboardApi = {
  // Get home dashboard data
  async getHomeData(userId: string): Promise<HomeDashboardData> {
    return apiClient.get(`/api/home/data?userId=${userId}`);
  },

  // Get lifestyle insights
  async getLifestyleInsights(userId: string): Promise<LifestyleInsights> {
    return apiClient.get(`/api/lifestyle/insights?userId=${userId}`);
  },

  // Get trends data
  async getTrends(userId: string, days?: number): Promise<TrendsResponse> {
    const params = new URLSearchParams({ userId });
    if (days) params.append("days", days.toString());
    return apiClient.get(`/api/utility/trends?${params}`);
  },

  // Get daily tip
  async getDailyTip(userId: string): Promise<DailyTip> {
    return apiClient.get(`/api/tip/today?userId=${userId}`);
  },

  // Extract sleep quality from transcript
  async extractSleepQuality(
    transcript: string,
    language: string,
    userId?: string,
  ): Promise<{ sleepQuality: number; extractedInfo: string }> {
    return apiClient.post("/api/utility/sleep/extract", {
      transcript,
      language,
      userId,
    });
  },

  // Generate clinical report PDF
  async generateClinicalReport(userId: string, days?: number): Promise<Blob> {
    return apiClient.postForBlob("/api/utility/clinical-share", {
      userId,
      days: days || 7,
    });
  },
};

export default dashboardApi;
