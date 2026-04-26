import { ScoreComponent } from './types';
import { ParsedDocument, SectionType } from '../parser';

export function scoreEducation(doc: ParsedDocument): ScoreComponent {
  const educationSection = doc.sections.find(s => s.type === SectionType.EDUCATION);
  
  if (!educationSection) {
    return {
      score: 0,
      matched: [],
      missing: ['Degree', 'Institution Name', 'Graduation Year', 'Field of Study', 'GPA', 'Academic Honors'],
      notes: ['No explicit Education section detected.']
    };
  }

  const text = educationSection.content.toLowerCase();
  
  let score = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  const notes: string[] = [];

  // 1. Degree (30 points)
  if (/(phd|ph\.d|doctorate)/.test(text)) {
    score += 30;
    matched.push('PhD/Doctorate');
  } else if (/(master|mba|m\.s|m\.a)/.test(text)) {
    score += 30;
    matched.push('Master\'s Degree');
  } else if (/(bachelor|b\.s|b\.a|bs|ba)\b/.test(text)) {
    score += 30;
    matched.push('Bachelor\'s Degree');
  } else if (/(associate|a\.s|a\.a)\b/.test(text)) {
    score += 30;
    matched.push('Associate Degree');
  } else if (/(diploma|certificate)/.test(text)) {
    score += 30;
    matched.push('Diploma/Certificate');
  } else {
    missing.push('Degree');
    notes.push('no clear degree type found. ensure your degree is explicitly stated.');
  }

  // 2. Institution (20 points)
  if (/(university|college|institute|school|academy|polytechnic)/.test(text)) {
    score += 20;
    matched.push('Institution Name');
  } else {
    missing.push('Institution Name');
    notes.push('institution name may not be clearly parseable');
  }

  // 3. Dates (15 points)
  if (/\b(19|20)\d{2}\b/.test(text)) {
    score += 15;
    matched.push('Graduation Year');
  } else {
    missing.push('Graduation Year');
    notes.push('no graduation date found. include your graduation year.');
  }

  // 4. Field of Study (15 points)
  if (/(computer science|engineering|business|finance|accounting|biology|chemistry|physics|math|psychology|nursing|history|english|art|design|economics|management|administration|science|major|minor)\b/.test(text)) {
    score += 15;
    matched.push('Field of Study');
  } else {
    missing.push('Field of Study');
    notes.push('consider explicitly stating your field of study');
  }

  // 5. GPA (10 points)
  const gpaMatch = text.match(/gpa\s*:?\s*([0-4]\.\d+)/);
  if (gpaMatch) {
    score += 10;
    matched.push('GPA');
    const gpaValue = parseFloat(gpaMatch[1]);
    if (gpaValue >= 3.5) {
      notes.push(`strong GPA (${gpaValue})`);
    } else if (gpaValue < 3.0) {
      notes.push('consider removing GPA below 3.0 unless required');
    } else {
      notes.push('GPA listed');
    }
  } else {
    missing.push('GPA');
  }

  // 6. Honors (10 points)
  if (/(cum laude|dean's list|honors|distinction)/.test(text)) {
    score += 10;
    matched.push('Academic Honors');
    notes.push('academic honors detected');
  } else {
    missing.push('Academic Honors');
  }

  return {
    score: Math.min(score, 100),
    matched,
    missing,
    notes
  };
}
