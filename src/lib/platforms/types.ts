import type { ScoringInput } from '../scorer/types';

export interface ATSQuirkResult {
  penalty: number;
  message: string;
}

export interface ATSQuirk {
  id: string;
  description: string;
  check: (input: ScoringInput) => ATSQuirkResult | null;
}

export interface ATSProfile {
  name: string;
  vendor: string;
  marketShare: string;
  description: string;
  parsingStrictness: number; // 0-1
  keywordStrategy: 'exact' | 'fuzzy' | 'semantic';
  weights: {
    formatting: number;
    keywordMatch: number;
    sectionCompleteness: number;
    experienceRelevance: number;
    educationMatch: number;
    quantification: number;
  };
  requiredSections: string[];
  preferredDateFormats?: string[];
  passingScore: number;
  quirks: ATSQuirk[];
}
