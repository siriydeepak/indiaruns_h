export interface JobDescriptionInput {
  job_id: string;
  title: string;
  raw_text_specification: string;
  flexible_skills_override?: string[] | null;
  weight_tuning_override?: Record<string, number> | null;
}

export interface RankedCandidate {
  id: string;
  name: string;
  current_title: string;
  skills: string[];
  semantic_score: number;
  behavioral_score: number;
  composite_score: number;
}

export interface RankedShortlistResponse {
  job_id: string;
  results: RankedCandidate[];
}

export async function discoverCandidates(job: JobDescriptionInput): Promise<RankedShortlistResponse> {
  const response = await fetch('/api/discover', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Failed to search candidates');
  }

  return response.json();
}
