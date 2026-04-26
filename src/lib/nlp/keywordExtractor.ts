import { tokenize } from './tokenizer';
import { SKILLS_TAXONOMY } from './skillsTaxonomy';

export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  const keywords = new Set<string>();

  for (const category of Object.values(SKILLS_TAXONOMY)) {
    for (const skill of category) {
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

  return Array.from(keywords);
}
