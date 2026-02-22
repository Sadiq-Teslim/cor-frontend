// Health API Service
import apiClient from "./client";
import type {
  FirstReadingResponse,
  BPCheckResponse,
  DailyReading,
  Baseline,
  CSSResult,
  BPEstimate,
  AlertData,
  AlertHistory,
} from "./types";

export const healthApi = {
  // First reading (baseline) - called once during onboarding
  async submitFirstReading(
    userId: string,
    hrv: number,
    heartRate?: number,
  ): Promise<FirstReadingResponse> {
    return apiClient.post("/api/first-reading", {
      userId,
      hrv,
      heartRate,
    });
  },

  // BP Check - regular check with context
  async submitBPCheck(
    userId: string,
    hrv: number,
    heartRate?: number,
    feelingNote?: string,
  ): Promise<BPCheckResponse> {
    return apiClient.post("/api/bp-check", {
      userId,
      hrv,
      heartRate,
      feelingNote,
    });
  },

  // Submit daily health reading
  async submitReading(data: {
    userId: string;
    hrv: number;
    heartRate?: number;
    date?: string;
    sedentaryHours: number;
    sleepQuality: number;
    screenStressIndex?: number;
    foodImpact?: number;
  }): Promise<{ reading: DailyReading; bpEstimate: BPEstimate }> {
    return apiClient.post("/api/health/readings", data);
  },

  // Get health readings
  async getReadings(
    userId: string,
    days?: number,
  ): Promise<{ readings: DailyReading[] }> {
    const params = new URLSearchParams({ userId });
    if (days) params.append("days", days.toString());
    return apiClient.get(`/api/health/readings?${params}`);
  },

  // Set baseline
  async setBaseline(
    userId: string,
    baseline: Baseline,
  ): Promise<{ baseline: Baseline }> {
    return apiClient.post("/api/health/baseline", { userId, baseline });
  },

  // Get baseline
  async getBaseline(userId: string): Promise<{ baseline: Baseline }> {
    return apiClient.get(`/api/health/baseline?userId=${userId}`);
  },

  // Get Cardiovascular Stress Score
  async getCSS(userId: string): Promise<{
    css: CSSResult;
    healthContext: {
      css: number;
      trend: string;
      hrv: number;
      hrvBaseline: number;
      hrvDelta: number;
      sedentaryHours: number;
      sleepQuality: number;
      worseningDays: number;
    };
  }> {
    return apiClient.get(`/api/health/css?userId=${userId}`);
  },

  // Check if alert should fire
  async checkAlert(userId: string): Promise<AlertData> {
    return apiClient.post("/api/health/alert", { userId });
  },

  // Estimate BP from HRV (standalone)
  async estimateBP(userId: string, hrv: number): Promise<BPEstimate> {
    return apiClient.post("/api/health/bp-estimate", { userId, hrv });
  },

  // Get alert history
  async getAlertHistory(
    userId: string,
    days?: number,
  ): Promise<{ alerts: AlertHistory[] }> {
    const params = new URLSearchParams({ userId });
    if (days) params.append("days", days.toString());
    return apiClient.get(`/api/health/alerts?${params}`);
  },
};

export default healthApi;
