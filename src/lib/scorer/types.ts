export interface ScoreComponent {
  score: number;
  matched: string[];
  missing: string[];
  notes: string[];
}

export interface FormatScoreComponent extends ScoreComponent {
  issues: string[];
  details: string[];
}

export interface ExperienceScoreComponent extends ScoreComponent {
  actionVerbCount: number;
  quantifiedBullets: number;
  totalBullets: number;
}

export interface ScoringInput {
  hasMultipleColumns: boolean;
  hasTables: boolean;
  hasImages: boolean;
  pageCount: number;
  wordCount: number;
  resumeText: string;
  resumeSections: string[];
  experienceBullets: string[];
  jobDescription?: string;
  resumeSkills: string[];
}

export interface Breakdown {
  formatting: FormatScoreComponent;
  keywordMatch: ScoreComponent;
  sections: ScoreComponent;
  experience: ExperienceScoreComponent;
  education: ScoreComponent;
}

export interface ScorerResult {
  overallScore: number;
  breakdown: Breakdown;
}

export interface ScoringWeights {
  formatting: number;
  keywordMatch: number;
  sectionCompleteness: number;
  experienceRelevance: number;
  educationMatch: number;
  quantification: number;
}
