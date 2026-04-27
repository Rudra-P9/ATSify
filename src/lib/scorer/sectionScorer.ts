import { ScoreComponent } from './types';

// scores section completeness based on the ATS profile's required sections
export function scoreSections(presentSections: string[], requiredSections: string[]): ScoreComponent {
  const presentSet = new Set(presentSections.map((s) => s.toLowerCase()));
  const present: string[] = [];
  const missing: string[] = [];

  for (const required of requiredSections) {
    if (presentSet.has(required.toLowerCase())) {
      present.push(required);
    } else {
      missing.push(required);
    }
  }

  // score based on percentage of required sections present
  const score =
    requiredSections.length > 0
      ? Math.round((present.length / requiredSections.length) * 100)
      : 100;

  return {
    score,
    matched: present,
    missing: missing,
    notes: missing.length > 0 ? [`Missing: ${missing.join(', ')}`] : ['All required sections present']
  };
}