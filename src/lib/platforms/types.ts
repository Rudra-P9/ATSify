import { ScoringWeights } from '../scorer/types';

export interface ATSQuirk {
  id: string;
  description: string;
  check: (input: any) => { penalty: number; message: string } | null;
}

export interface ATSProfile {
  name: string;
  vendor: string;
  marketShare: string;
  description: string;
  parsingStrictness: number;
  keywordStrategy: 'semantic' | 'exact';
  weights: {
    formatting: number;
    keywordMatch: number;
    sectionCompleteness: number;
    experienceRelevance: number;
    educationMatch: number;
    quantification: number;
  };
  requiredSections: string[];
  preferredDateFormats: string[];
  quirks: ATSQuirk[];
  passingScore: number;
}
