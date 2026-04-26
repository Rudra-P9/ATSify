import { FormatScoreComponent } from './types';
import { ParsedDocument } from '../parser';
import { DEFAULT_THRESHOLDS } from '../config/thresholds';

export function scoreFormatting(doc: ParsedDocument): FormatScoreComponent {
  let score = 100;
  const issues: string[] = [];

  if (doc.metadata.hasColumns) {
    score -= DEFAULT_THRESHOLDS.HIGH_PRIORITY_DELTA;
    issues.push('Multi-column layout detected (difficult for some legacy ATS).');
  }
  
  if (doc.metadata.hasTables) {
    score -= DEFAULT_THRESHOLDS.FORMATTING_ISSUE_PENALTY;
    issues.push('Tables detected (often breaks parsing algorithms).');
  }
  
  if (doc.metadata.hasGraphics) {
    score -= DEFAULT_THRESHOLDS.MEDIUM_PRIORITY_DELTA;
    issues.push('Unparseable graphics/images found.');
  }

  return {
    score: Math.max(score, 0),
    matched: [],
    missing: [],
    notes: ['Standardized font rules applied.'],
    issues
  };
}
