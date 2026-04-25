import { ScoringWeights } from '../scorer/types';

export interface ATSProfile {
  id: string;
  name: string;
  vendor: string;
  weights: ScoringWeights;
  strictFormatting: boolean; // Taleo is strict, Lever is not
  requiresExactKeywordMatch: boolean;
}
