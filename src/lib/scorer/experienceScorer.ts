import type { ScoreBreakdown } from './types';

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

export function scoreExperience(bullets: string[]): ScoreBreakdown['experience'] {
  if (!bullets || bullets.length === 0) {
    return {
      score: 0,
      quantifiedBullets: 0,
      totalBullets: 0,
      actionVerbCount: 0,
      highlights: []
    };
  }

  const bulletLines = bullets.map(b => b.trim()).filter(b => b.length > 0);

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
  const highlights = bulletLines.filter(l => /\d+%/.test(l) || /\$\d+/.test(l)).slice(0, 3);

  return {
    score: Math.min(Math.round(score), 100),
    quantifiedBullets,
    totalBullets,
    actionVerbCount,
    highlights
  };
}