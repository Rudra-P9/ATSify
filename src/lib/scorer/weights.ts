import { ScoringWeights } from '../scorer/types';

export const GLOBAL_BASELINE_WEIGHTS: ScoringWeights = {
  formatting: 0.15,
  keywordMatch: 0.25,
  sectionCompleteness: 0.15,
  experienceRelevance: 0.20,
  educationMatch: 0.10,
  quantification: 0.15
};
