import { ScoreComponent } from './types';
import { ParsedDocument, SectionType } from '../parser';
import { DEFAULT_THRESHOLDS } from '../config/thresholds';

const REQUIRED_SECTIONS = [SectionType.EXPERIENCE, SectionType.EDUCATION, SectionType.SKILLS];

export function scoreSections(doc: ParsedDocument): ScoreComponent {
  const foundSections = doc.sections.map(s => s.type);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const required of REQUIRED_SECTIONS) {
    if (foundSections.includes(required)) {
      matched.push(required);
    } else {
      missing.push(required);
    }
  }

  // Calculate base structure health
  const ratio = matched.length / REQUIRED_SECTIONS.length;
  let score = Math.round(ratio * 100);

  // Penalize for completely unidentifiable structure
  if (foundSections.filter(s => s === SectionType.UNKNOWN).length > 2) {
    score -= DEFAULT_THRESHOLDS.HIGH_PRIORITY_DELTA;
  }

  return {
    score: Math.max(score, 0),
    matched,
    missing,
    notes: missing.length > 0 ? ['Missing critical ATS standard sections'] : ['Standard sections verified']
  };
}
