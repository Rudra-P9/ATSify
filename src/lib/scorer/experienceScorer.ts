import { ExperienceScoreComponent } from './types';
import { ParsedDocument, SectionType } from '../parser/index';

const ACTION_VERBS = [
  'led',
  'managed',
  'developed',
  'created',
  'designed',
  'optimized',
  'spearheaded',
  'integrated',
  'orchestrated'
];

export function scoreExperience(doc: ParsedDocument): ExperienceScoreComponent {
  const experienceSection = doc.sections.find(s => s.type === SectionType.EXPERIENCE);

  if (!experienceSection) {
    return {
      score: 0,
      matched: [],
      missing: [],
      notes: ['No explicit Experience section detected.'],
      actionVerbCount: 0,
      quantifiedBullets: 0,
      totalBullets: 0
    };
  }

  const text = experienceSection.content;
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  const bulletLines = lines.filter(l =>
    /^[-•●▪◦]/.test(l.trim())
  );

  let actionVerbCount = 0;
  let quantifiedBullets = 0;
  const totalBullets = bulletLines.length;

  for (const line of bulletLines) {
    const l = line.toLowerCase();

    if (/\d+%/.test(l) || /\$\d+/.test(l) || /\b\d+\b/.test(l)) {
      quantifiedBullets++;
    }

    for (const verb of ACTION_VERBS) {
      if (l.includes(verb)) {
        actionVerbCount++;
        break;
      }
    }
  }

  const quantityRatio = totalBullets > 0 ? quantifiedBullets / totalBullets : 0;
  const verbRatio = totalBullets > 0 ? actionVerbCount / totalBullets : 0;

  const score = 50 + (quantityRatio * 25) + (verbRatio * 25);

  return {
    score: Math.min(Math.round(score), 100),
    matched: [],
    missing: [],
    notes: [`Found ${quantifiedBullets} quantified bullets out of ${totalBullets} total.`],
    actionVerbCount,
    quantifiedBullets,
    totalBullets
  };
}
