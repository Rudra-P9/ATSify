import { tokenize } from './tokenizer';
import { SKILLS_TAXONOMY } from './skills-taxonomy';

/**
 * Common JD filler words that should never be treated as scoring keywords.
 * These are generic terms that appear in almost every job description
 * but carry no skill-matching value.
 */
const JD_FILLER = new Set([
  'team', 'work', 'experience', 'ability', 'strong', 'excellent',
  'understanding', 'knowledge', 'skills', 'looking', 'position',
  'role', 'company', 'organization', 'responsibilities', 'requirements',
  'qualifications', 'candidate', 'opportunity', 'environment',
  'collaborative', 'dynamic', 'self-starter', 'fast-paced',
  'motivated', 'passionate', 'innovative', 'responsible',
  'proficiency', 'proficient', 'expertise', 'familiar',
  'required', 'preferred', 'minimum', 'desired', 'ideal',
  'including', 'related', 'relevant', 'equivalent', 'similar',
  'working', 'professional', 'demonstrated', 'proven',
  'effectively', 'independently', 'across', 'within',
  'based', 'field', 'industry', 'sector', 'area',
  'bachelor', 'master', 'degree', 'years',
]);

/**
 * Extracts meaningful keywords from text using the skills taxonomy.
 *
 * - Single-word skills: checked via tokenized word set
 * - Multi-word skills: checked via phrase matching
 * - ALL-CAPS tokens (≥2 chars): captured as likely acronyms (e.g., SEO, SEM, CPA)
 * - JD filler words are filtered out
 */
export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens.map((t) => t.normalized));
  const keywords = new Set<string>();

  // 1. Match against comprehensive skills taxonomy
  for (const category of SKILLS_TAXONOMY) {
    for (const skill of category.skills) {
      const skillTokens = skill.toLowerCase().split(/\s+/);

      if (skillTokens.length === 1) {
        if (tokenSet.has(skillTokens[0])) {
          keywords.add(skill);
        }
      } else {
        const phrase = skillTokens.join(' ');
        if (text.toLowerCase().includes(phrase)) {
          keywords.add(skill);
        }
      }
    }
  }

  // 2. Capture ALL-CAPS tokens as likely acronyms (SEO, SEM, CPA, PMP)
  // HARDENED: filters out garbage from PDF text concatenation and common non-skill tokens.
  const ACRONYM_BLOCKLIST = new Set([
    'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII',  // roman numerals
    'VS', 'SC', 'AM', 'PM', 'AN', 'AT', 'IN', 'ON', 'OR', 'IF', // common words
    'OF', 'BY', 'TO', 'IS', 'IT', 'AS', 'BE', 'DO', 'GO', 'NO', 'SO', 'UP', 'WE',
    'OK', 'US', 'HE', 'ME', 'MY', 'OH',
    'GPA', 'CGPA', 'SAT', 'ACT', 'GRE', 'GMAT', 'IELTS', 'TOEFL', // academic terms
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS',
    'ONE', 'OUR', 'OUT', 'HAS', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD',
    'SEE', 'WAY', 'WHO', 'DID', 'GET', 'LET', 'SAY', 'SHE', 'TOO', 'USE',
    'INC', 'LLC', 'LTD', 'JAN', 'FEB', 'MAR', 'APR', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ]);

  const words = text.split(/[\s,;|]+/);
  for (const word of words) {
    const clean = word.replace(/[^A-Za-z0-9+#]/g, '');  // strip dots too (prevents GPA3.723)
    // Must be 2-10 chars, ALL letters must be uppercase, must have ≥2 letters, not in blocklist
    const letters = clean.replace(/[^A-Za-z]/g, '');
    if (
      clean.length >= 2 &&
      clean.length <= 10 &&
      letters.length >= 2 &&
      letters === letters.toUpperCase() &&
      /[A-Z]/.test(clean) &&
      !ACRONYM_BLOCKLIST.has(clean) &&
      !JD_FILLER.has(clean.toLowerCase()) &&
      !/^\d/.test(clean)  // no leading digits (catches things like "3D" false positives)
    ) {
      keywords.add(clean);
    }
  }

  // 3. Filter out JD filler words that may have matched via taxonomy
  return Array.from(keywords).filter(kw => !JD_FILLER.has(kw.toLowerCase()));
}
