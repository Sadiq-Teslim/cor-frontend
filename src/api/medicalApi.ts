// Medical Records API Service
import apiClient from "./client";
import type { MedicalRecord } from "./types";

export const medicalApi = {
  // Upload medical record
  async uploadRecord(
    file: File,
    userId: string,
  ): Promise<{ record: MedicalRecord }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    return apiClient.postFormData("/api/medical/upload", formData);
  },

  // Get all medical records
  async getRecords(userId: string): Promise<{ records: MedicalRecord[] }> {
    return apiClient.get(`/api/medical/records?userId=${userId}`);
  },
};

export default medicalApi;
