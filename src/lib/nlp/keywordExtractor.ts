import { tokenize } from './tokenizer';
import { SKILLS_TAXONOMY } from './skillsTaxonomy';

export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  const keywords = new Set<string>();

  // Extract from predefined taxonomy heavily biased towards skills
  for (const category of Object.values(SKILLS_TAXONOMY)) {
    for (const skill of category) {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        keywords.add(skill);
      }
    }
  }

  // Very basic heuristic for arbitrary keyword extraction (capitalized words like AWS, SEO)
  const arbitraryMatches = text.match(/\b[A-Z]{2,}\b/g);
  if (arbitraryMatches) {
    arbitraryMatches.forEach(m => keywords.add(m));
  }

  return Array.from(keywords);
}
