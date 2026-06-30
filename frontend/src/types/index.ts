export interface BehavioralSignals {
  profile_completeness: number;
  career_velocity_score: number;
  interaction_response_rate: number;
  days_since_last_activity: number;
}

export interface CandidateProfile {
  id: string;
  name: string;
  current_title: string;
  full_resume_text: string;
  skills: string[];
  behavioral_signals: BehavioralSignals;
}
