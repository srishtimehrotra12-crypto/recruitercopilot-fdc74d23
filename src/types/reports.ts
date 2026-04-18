export interface SkillMatch {
  skill: string;
  required: boolean;
  rating: "Strong" | "Adequate" | "Weak" | "Missing";
  evidence?: string;
}

export interface InterviewQuestion {
  question: string;
  purpose: string;
  lookFor: string;
}

export interface RedFlagQuestion {
  question: string;
  context: string;
}

export interface CareerHighlight {
  title: string;
  detail: string;
}

export interface CompensationEstimate {
  range: string;
  rationale: string;
}

export interface IntelligenceReport {
  executiveSummary: string;
  candidateSnapshot: {
    yearsOfExperience: string;
    currentRole: string;
    seniority: string;
    location?: string;
    education?: string;
  };
  skillsMatch: SkillMatch[];
  experienceRelevance: string;
  careerHighlights: CareerHighlight[];
  careerTrajectory: string;
  culturalIndicators: string;
  motivationFitSignals: string;
  riskFactors: string;
  strengths: string[];
  developmentAreas: string[];
  compensationEstimate?: CompensationEstimate;
  diversityNeutralNotes?: string;
  overallVerdict: string;
  confidenceLevel: "High" | "Medium" | "Low";
  confidenceRationale: string;
  recommendedNextSteps: string;
}

export interface InterviewKit {
  behavioralQuestions: InterviewQuestion[];
  technicalQuestions: InterviewQuestion[];
  redFlagQuestions: RedFlagQuestion[];
  evaluationCriteria: string;
  suggestedFormat: string;
  suggestedDuration: string;
}

export interface CandidateReport {
  name: string;
  score: number;
  verdict: string;
  intelligenceReport: IntelligenceReport;
  interviewKit: InterviewKit;
}
