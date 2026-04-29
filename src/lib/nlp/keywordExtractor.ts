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

  // 2. Capture ALL-CAPS tokens not in taxonomy (likely acronyms: SEO, SEM, CPA, PMP)
  const words = text.split(/[\s,;|]+/);
  for (const word of words) {
    const clean = word.replace(/[^A-Za-z0-9+#.]/g, '');
    if (
      clean.length >= 2 &&
      clean === clean.toUpperCase() &&
      /[A-Z]/.test(clean) &&
      !JD_FILLER.has(clean.toLowerCase())
    ) {
      keywords.add(clean);
    }
  }

  // 3. Filter out JD filler words that may have matched via taxonomy
  return Array.from(keywords).filter(kw => !JD_FILLER.has(kw.toLowerCase()));
}
