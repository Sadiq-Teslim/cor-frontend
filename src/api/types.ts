// API Types for Cor Backend

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// User types
export interface User {
  id: string;
  name: string;
  age: number;
  biologicalSex: "male" | "female" | "other";
  preferredLanguage: LanguageCode;
  hasHypertension?: boolean;
  medications?: string[];
  smokes?: boolean;
  drinksAlcohol?: boolean;
  activityLevel?: "low" | "moderate" | "high";
  averageSleepHours?: number;
  familyHistoryHeartDisease?: boolean;
  smartwatchConnected?: boolean;
  smartwatchType?: "apple" | "google" | "samsung" | "fitbit";
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingData {
  name: string;
  age: number;
  biologicalSex: "male" | "female" | "other";
  preferredLanguage: LanguageCode;
  hasHypertension?: string;
  medications?: string;
  smokes?: boolean;
  drinksAlcohol?: boolean;
  activityLevel?: "low" | "moderate" | "high";
  averageSleepHours?: number;
  smartwatchConnected?: boolean;
  smartwatchType?: "apple" | "google" | "samsung" | "fitbit";
}

// Health types
export interface DailyReading {
  date: string;
  hrv: number;
  heartRate?: number;
  sedentaryHours: number;
  sleepQuality: number;
  screenStressIndex?: number;
  foodImpact?: number;
}

export interface Baseline {
  hrv: number;
  sedentaryHours: number;
  sleepQuality: number;
  screenStressIndex?: number;
}

export interface CSSResult {
  score: number;
  trend: "improving" | "stable" | "worsening";
  worseningDays: number;
  shouldAlert: boolean;
  hrvDelta: number;
}

export interface BPEstimate {
  systolic: number;
  diastolic: number;
  confidence: number;
  category?: string;
  risk?: string;
  disclaimer?: string;
}

export interface BPCheckResponse {
  reading: {
    systolic: number;
    diastolic: number;
    hrv: number;
    heartRate: number;
    date: string;
  };
  context: {
    comparedToAverage: "normal" | "elevated" | "lower";
    message: string;
    recommendation: string;
  };
  category: {
    category: string;
    risk: string;
  };
}

export interface BPReadingHistory {
  id: string;
  userId: string;
  date: string;
  systolic: number;
  diastolic: number;
  hrv: number;
  heartRate?: number;
  confidence: number;
  method: string;
  feelingNote?: string;
  createdAt: string;
}

export interface FirstReadingResponse {
  message: string;
  hrvStatus: "normal" | "low" | "high";
  reading: {
    hrv: number;
    heartRate: number;
    date: string;
  };
  bpEstimate: BPEstimate;
}

// Food types
export interface FoodAnalysis {
  foodName: string;
  calories?: number;
  sodium?: number;
  potassium?: number;
  bpImpact: "low" | "moderate" | "high";
  message: string;
}

// Medication types
export interface Medication {
  id: string;
  userId: string;
  name: string;
  affectsBP: boolean;
  dailyReminder: boolean;
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  userId: string;
  takenAt: string;
  date: string;
}

// Medical Record types
export interface MedicalRecord {
  id: string;
  userId: string;
  fileName: string;
  extractedData?: {
    diagnoses?: string[];
    medications?: string[];
    labResults?: Record<string, any>;
    bpReadings?: Array<{ date: string; systolic: number; diastolic: number }>;
  };
  uploadedAt: string;
}

// Home Dashboard types
export interface HomeDashboardData {
  healthPulse: string;
  hasMedicationReminder: boolean;
  medicationReminders: Array<{ name: string; time: string }>;
  recentActivity: string;
  css: {
    score: number;
    trend: string;
  };
  lastReading?: {
    date: string;
    hrv: number;
    heartRate: number;
  };
  todayTip: string;
}

// Lifestyle Insights types
export interface LifestyleInsights {
  summary: string;
  recommendation: string;
  weekStats: {
    sleepDisruptedNights: number;
    averageSedentaryHours: number;
    highSodiumMeals: number;
    averageCSS: number;
  };
}

// Trends types
export interface TrendData {
  date: string;
  css: number;
  hrv: number;
  sedentaryHours: number;
  sleepQuality: number;
  trend: string;
}

export interface TrendsResponse {
  trends: TrendData[];
  baseline: Baseline;
  summary: {
    bestDay: TrendData & { [key: string]: any };
    worstDay: TrendData & { [key: string]: any };
    averageCSS: number;
  };
}

// Settings types
export interface UserSettings {
  language: LanguageCode;
  wakeWordEnabled: boolean;
  smartwatchConnected: boolean;
  smartwatchType: string | null;
  notificationsEnabled: boolean;
}

// Alert types
export interface AlertData {
  shouldAlert: boolean;
  message: string;
  css?: CSSResult;
}

export interface AlertHistory {
  date: string;
  hasAlerted: boolean;
  createdAt: string;
}

// Voice types
export interface TranscriptionResponse {
  text: string;
  language: string;
}

export interface VoiceResponse {
  text: string;
  language: string;
}

// Daily Tip
export interface DailyTip {
  tip: string;
  category:
    | "general"
    | "stress_management"
    | "sleep"
    | "activity"
    | "maintenance";
  language: string;
}

// Language codes
export type LanguageCode = "en" | "pcm" | "yo" | "ig" | "ha" | "fr";

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  pcm: "Pidgin",
  yo: "Yoruba",
  ig: "Igbo",
  ha: "Hausa",
  fr: "French",
};

export const LANGUAGE_MAP: Record<string, LanguageCode> = {
  English: "en",
  Pidgin: "pcm",
  Yoruba: "yo",
  Igbo: "ig",
  Hausa: "ha",
  French: "fr",
};
