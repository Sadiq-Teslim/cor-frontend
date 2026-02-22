// Food API Service
import apiClient from "./client";
import type { FoodAnalysis } from "./types";

export const foodApi = {
  // Analyze food image
  async analyzeImage(image: File, userId?: string): Promise<FoodAnalysis> {
    const formData = new FormData();
    formData.append("image", image);
    if (userId) formData.append("userId", userId);
    return apiClient.postFormData("/api/food/analyze", formData);
  },

  // Log food via voice
  async logVoice(audio: File, userId: string): Promise<FoodAnalysis> {
    const formData = new FormData();
    formData.append("audio", audio);
    formData.append("userId", userId);
    return apiClient.postFormData("/api/food/voice", formData);
  },
};

export default foodApi;
