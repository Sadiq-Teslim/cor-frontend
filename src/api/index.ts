// API Services - Main Export
export { default as apiClient, ApiError } from "./client";
export { default as userApi } from "./userApi";
export { default as healthApi } from "./healthApi";
export { default as foodApi } from "./foodApi";
export { default as voiceApi } from "./voiceApi";
export { default as medicationApi } from "./medicationApi";
export { default as medicalApi } from "./medicalApi";
export { default as dashboardApi } from "./dashboardApi";
export { default as settingsApi } from "./settingsApi";

// Re-export types
export * from "./types";
