import { ScoreComponent } from './types';
import { ParsedDocument, SectionType } from '../parser';

export function scoreEducation(doc: ParsedDocument): ScoreComponent {
  const educationSection = doc.sections.find(s => s.type === SectionType.EDUCATION);
  
  if (!educationSection) {
    return {
      score: 0,
      matched: [],
      missing: ['Degree Verification', 'University Name'],
      notes: ['No explicit Education section detected.']
    };
  }

  const text = educationSection.content.toLowerCase();
  
  let score = 50;
  const matched: string[] = [];
  const missing: string[] = [];

  // Check for degree types
  if (text.includes('bachelor') || text.includes('bs') || text.includes('ba')) {
    score += 25;
    matched.push('Bachelor Degree Detected');
  } else if (text.includes('master') || text.includes('ms') || text.includes('ma') || text.includes('phd')) {
    score += 50;
    matched.push('Advanced Degree Detected');
  } else {
    missing.push('Degree Definition');
  }

  // Check for university presence heuristically
  if (text.includes('university') || text.includes('college') || text.includes('institute')) {
    score += 25;
    matched.push('Institution Verification');
  } else {
    missing.push('Institution Verification');
  }

  return {
    score: Math.min(score, 100),
    matched,
    missing,
    notes: []
  };
}
