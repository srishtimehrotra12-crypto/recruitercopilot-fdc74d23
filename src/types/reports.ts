export interface SkillMatch {
  skill: string;
  required: boolean;
  rating: "Strong" | "Adequate" | "Weak" | "Missing";
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

export interface IntelligenceReport {
  executiveSummary: string;
  skillsMatch: SkillMatch[];
  experienceRelevance: string;
  culturalIndicators: string;
  riskFactors: string;
  overallVerdict: string;
  confidenceLevel: "High" | "Medium" | "Low";
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
