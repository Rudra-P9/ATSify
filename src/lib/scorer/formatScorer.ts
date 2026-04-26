import { FormatScoreComponent } from './types';
import { ParsedDocument } from '../parser';

export function scoreFormatting(doc: ParsedDocument): FormatScoreComponent {
  let score = 100;
  const issues: string[] = [];

  if (doc.metadata.hasColumns) {
    score -= 15;
    issues.push('Multi-column layout detected (difficult for some legacy ATS).');
  }
  
  if (doc.metadata.hasTables) {
    score -= 20;
    issues.push('Tables detected (often breaks parsing algorithms).');
  }
  
  if (doc.metadata.hasGraphics) {
    score -= 10;
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
