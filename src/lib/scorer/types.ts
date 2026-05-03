import { ExperienceEntry, EducationEntry } from '../parser/types';
export type { ATSProfile } from '../platforms/types';

export interface ScoringInput {
  hasMultipleColumns: boolean;
  hasTables: boolean;
  hasImages: boolean;
  pageCount: number;
  wordCount: number;
  resumeText: string;
  resumeSections: string[];
  experienceBullets: string[];
  experienceEntries: ExperienceEntry[];
  educationText: string;
  educationEntries: EducationEntry[];
  jobDescription?: string;
  resumeSkills: string[];
}

export interface ScoreBreakdown {
  formatting: {
    score: number;
    issues: string[];
    details: string[];
  };
  keywordMatch: {
    score: number;
    matched: string[];
    missing: string[];
    synonymMatched: string[];
  };
  sections: {
    score: number;
    present: string[];
    missing: string[];
  };
  experience: {
    score: number;
    quantifiedBullets: number;
    totalBullets: number;
    actionVerbCount: number;
    highlights: string[];
  };
  education: {
    score: number;
    notes: string[];
  };
}

export interface ScoreResult {
  system: string;
  vendor: string;
  overallScore: number;
  passesFilter: boolean;
  breakdown: ScoreBreakdown;
  suggestions: string[];
  engineUsed?: 'gemini' | 'deterministic-fallback';
}

export interface ScoringWeights {
  formatting: number;
  keywordMatch: number;
  sectionCompleteness: number;
  experienceRelevance: number;
  educationMatch: number;
  quantification: number;
}
