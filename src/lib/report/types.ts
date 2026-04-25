import { ScorerResult } from '../scorer';

export interface Insight {
  category: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  deltaPotential: number; // Potential score increase
}

export interface ATSReport {
  score: number;
  insights: Insight[];
  summary: string;
}
