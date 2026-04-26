import { ScoringWeights } from '../scorer/types';

export const GLOBAL_BASELINE_WEIGHTS: ScoringWeights = {
  formatting: 0.20,
  keywordMatch: 0.35,
  sections: 0.15,
  experience: 0.20,
  education: 0.10
};
