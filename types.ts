
export interface QuizAnswers {
  condition: string;
  location: string;
  storms: string;
  cracks: string;
  age: string;
  concerns?: string;
}

export interface UserInfo {
  name: string;
  email: string;
  phone: string;
  postcode: string;
}

export interface AssessmentResult {
  riskLevel: number;
  status: 'Low' | 'Moderate' | 'High' | 'Critical';
  statusLabel: string;
  summary: string;
  planSteps: string[];
  timeline: string;
  recommendations: string[];
}

export interface HistoricalReport {
  id: string;
  timestamp: number;
  userInfo: UserInfo;
  answers: QuizAnswers;
  assessment: AssessmentResult;
}

export interface LoadingStep {
  id: number;
  label: string;
  description: string;
}

export type AppState = 'HOME' | 'QUIZ' | 'ADDITIONAL_INFO' | 'LEAD_CAPTURE' | 'LOADING' | 'RESULTS' | 'HISTORY_VIEW';
