/**
 * Utility for score classification
 */

export interface ScoreClassification {
  label: string;
  color: string;
}

export function classifyScore(score: number): ScoreClassification {
  if (score >= 80) return { label: 'Excellent', color: '#10b981' };
  if (score >= 60) return { label: 'Good', color: '#eab308' };
  if (score >= 40) return { label: 'Weak', color: '#f97316' };
  return { label: 'Poor', color: '#ef4444' };
}
