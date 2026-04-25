export interface ScoreComponent {
  score: number;
  matched: string[];
  missing: string[];
  notes: string[];
}

export interface FormatScoreComponent extends ScoreComponent {
  issues: string[];
}

export interface ExperienceScoreComponent extends ScoreComponent {
  actionVerbCount: number;
  quantifiedBullets: number;
  totalBullets: number;
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
  sections: number;
  experience: number;
  education: number;
}
