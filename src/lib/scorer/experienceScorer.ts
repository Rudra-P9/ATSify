import type { ScoreBreakdown } from './types';

// comprehensive action verb list for ATS resume scoring
const ACTION_VERBS = new Set([
  'achieved', 'administered', 'analyzed', 'architected', 'automated',
  'built', 'collaborated', 'conducted', 'configured', 'coordinated',
  'created', 'decreased', 'defined', 'delivered', 'deployed',
  'designed', 'developed', 'directed', 'drove', 'enhanced',
  'established', 'evaluated', 'executed', 'expanded', 'facilitated',
  'generated', 'grew', 'guided', 'implemented', 'improved',
  'increased', 'initiated', 'integrated', 'launched', 'led',
  'managed', 'mentored', 'migrated', 'monitored', 'negotiated',
  'optimized', 'orchestrated', 'oversaw', 'partnered', 'planned',
  'presented', 'produced', 'programmed', 'published', 'reduced',
  'refactored', 'researched', 'resolved', 'scaled', 'shipped',
  'spearheaded', 'streamlined', 'supervised', 'supported', 'tested',
  'trained', 'transformed', 'upgraded', 'utilized'
]);

/**
 * Patterns that indicate a genuine quantified achievement,
 * NOT incidental numbers like version numbers, dates, or list counts.
 */
const QUANTIFICATION_PATTERNS = [
  /\d+\s*%/,                                 // percentages: "40%", "40 %"
  /\$[\d,.]+[KkMmBb]?/,                     // dollar amounts: "$2M", "$120,000", "$50K"
  /\d+[xX]\b/,                               // multipliers: "3x", "10X"
  /\b\d{2,}\+?\s*(users?|customers?|clients?|team\s*members?|engineers?|employees?|people|developers?|members?)/i,
  /\b\d{2,}\+?\s*(requests?|transactions?|orders?|calls?|queries|endpoints?|services?|applications?|servers?|nodes?)/i,
  /\b(sav|reduc|improv|increas|decreas|grew?|boost|cut|lower|rais|eliminat|accelerat)\w*\s+.*\b\d{2,}/i,
  /\d+\s*(hours?|days?|weeks?|months?|minutes?)\b/i,  // time savings
  /\b\d{2,}\+?\s*(features?|products?|projects?|releases?|sprints?|modules?|components?|integrations?)/i,
  /\b(top|first)\s*\d+/i,                    // rankings: "top 5", "first 3"
  /\bover\s+\d{2,}/i,                        // "over 50 engineers"
];

/**
 * Checks whether a bullet point describes a quantified achievement
 * rather than just incidentally containing a number.
 *
 * "Reduced costs by 40%" → true
 * "Used Python 3" → false
 * "Migrated from v1 to v2" → false
 */
function isQuantifiedAchievement(bullet: string): boolean {
  return QUANTIFICATION_PATTERNS.some(pattern => pattern.test(bullet));
}

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
    // Check for quantified achievements using robust patterns
    if (isQuantifiedAchievement(line)) {
      quantifiedBullets++;
    }

    // Check for action verbs: strip leading bullet characters, then check first word
    const cleanLine = line.replace(/^[-•·▪◦▸►‣*]\s*/, '').toLowerCase();
    const firstWord = cleanLine.split(/\s+/)[0];
    if (ACTION_VERBS.has(firstWord)) {
      actionVerbCount++;
    }
  }

  const quantityRatio = totalBullets > 0 ? quantifiedBullets / totalBullets : 0;
  const verbRatio = totalBullets > 0 ? actionVerbCount / totalBullets : 0;

  // Base score of 30 for having any experience content,
  // plus up to 35 for quantification and 35 for action verbs
  const score = 30 + (quantityRatio * 35) + (verbRatio * 35);
  const highlights = bulletLines.filter(l => isQuantifiedAchievement(l)).slice(0, 3);

  return {
    score: Math.min(Math.round(score), 100),
    quantifiedBullets,
    totalBullets,
    actionVerbCount,
    highlights
  };
}