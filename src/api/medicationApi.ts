// Medications API Service
import apiClient from './client';
import type { Medication, MedicationLog } from './types';

export const medicationApi = {
  // Get all medications for user
  async getMedications(userId: string): Promise<{ medications: Medication[] }> {
    return apiClient.get(`/api/medications?userId=${userId}`);
  },

  // Add new medication
  async addMedication(data: {
    userId: string;
    name: string;
    affectsBP?: boolean;
    dailyReminder?: boolean;
    reminderTime?: string;
  }): Promise<{ medication: Medication; message: string }> {
    return apiClient.post('/api/medications', data);
  },

  // Update medication
  async updateMedication(
    medicationId: string,
    data: Partial<Pick<Medication, 'name' | 'affectsBP' | 'dailyReminder' | 'reminderTime'>>
  ): Promise<{ medication: Medication }> {
    return apiClient.put(`/api/medications/${medicationId}`, data);
  },

  // Delete medication
  async deleteMedication(medicationId: string): Promise<void> {
    return apiClient.delete(`/api/medications/${medicationId}`);
  },

  // Log medication taken
  async logMedicationTaken(medicationId: string, userId: string): Promise<{ log: MedicationLog }> {
    return apiClient.post(`/api/medications/${medicationId}/log`, { userId });
  },

  // Get medication logs
  async getMedicationLogs(userId: string, days?: number): Promise<{ logs: MedicationLog[] }> {
    const params = new URLSearchParams({ userId });
    if (days) params.append('days', days.toString());
    return apiClient.get(`/api/medications/logs?${params}`);
  },
};

export default medicationApi;
