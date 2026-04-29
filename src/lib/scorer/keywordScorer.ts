import type { ScoreBreakdown } from './types';
import { extractKeywords } from '../nlp/keywordExtractor';
import { getCanonical, getSynonyms } from '../nlp/synonyms';

/**
 * Escapes special regex characters in a string so it can be used in a RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a keyword exists in the text as a whole word (word-boundary match).
 * Prevents "react" from matching "reactive" or "go" from matching "going".
 */
function wordMatch(text: string, keyword: string): boolean {
  const escaped = escapeRegex(keyword.toLowerCase());
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/**
 * Matches resume keywords against JD keywords using the specified strategy.
 *
 * Strategies:
 * - exact:    word-boundary matching only. plurals tolerated at reduced weight.
 * - fuzzy:    exact + synonym dictionary lookup (canonical form mapping).
 * - semantic: fuzzy + stem/plural variations.
 */
export function matchKeywords(
  resumeText: string,
  jobDescription: string,
  strategy: 'exact' | 'fuzzy' | 'semantic'
): ScoreBreakdown['keywordMatch'] {
  if (!jobDescription) {
    // No JD (General Readiness mode): score based on resume's own keyword density.
    // A typical resume with 10-15 extracted skills should score around 65-75.
    const resumeKeywords = extractKeywords(resumeText);
    const baseScore = 15;
    const densityScore = Math.min(55, resumeKeywords.length * 5);
    const score = Math.min(80, baseScore + densityScore);
    return {
      score,
      matched: resumeKeywords,
      missing: [],
      synonymMatched: []
    };
  }

  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywordSet = new Set(extractKeywords(resumeText).map(k => k.toLowerCase()));

  const matched: string[] = [];
  const missing: string[] = [];
  const synonymMatched: string[] = [];

  for (const kw of jdKeywords) {
    const kwLower = kw.toLowerCase();

    // 1. Direct word-boundary match in resume text
    if (wordMatch(resumeText, kwLower) || resumeKeywordSet.has(kwLower)) {
      matched.push(kw);
      continue;
    }

    // 2. Strategy-specific fallback matching
    if (strategy === 'fuzzy' || strategy === 'semantic') {
      // Check synonym dictionary: map keyword to canonical form, then check all aliases
      const canonical = getCanonical(kwLower);
      const synonyms = getSynonyms(canonical);
      let foundSynonym = false;

      for (const syn of synonyms) {
        if (wordMatch(resumeText, syn) || resumeKeywordSet.has(syn.toLowerCase())) {
          synonymMatched.push(kw);
          foundSynonym = true;
          break;
        }
      }

      if (!foundSynonym && strategy === 'semantic') {
        // Semantic: also check plural/stem variations
        const stemmed = kwLower.replace(/(?:ing|ed|s|tion|ment)$/, '');
        if (stemmed !== kwLower && stemmed.length >= 3 && wordMatch(resumeText, stemmed)) {
          synonymMatched.push(kw);
          foundSynonym = true;
        }
      }

      if (!foundSynonym) {
        missing.push(kw);
      }
    } else {
      // Exact mode: only allow simple plural tolerance (skill → skills)
      if (kwLower.endsWith('s') && wordMatch(resumeText, kwLower.slice(0, -1))) {
        synonymMatched.push(kw);
      } else if (wordMatch(resumeText, kwLower + 's')) {
        synonymMatched.push(kw);
      } else {
        missing.push(kw);
      }
    }
  }

  // Synonym weights: exact gives minimal credit, fuzzy moderate, semantic near-full
  const synonymWeight = strategy === 'semantic' ? 0.85 : strategy === 'fuzzy' ? 0.70 : 0.20;
  const effectiveMatchedCount = matched.length + (synonymMatched.length * synonymWeight);
  const ratio = jdKeywords.length > 0 ? effectiveMatchedCount / jdKeywords.length : 1;
  const score = Math.max(0, Math.min(100, Math.round(ratio * 100)));

  return {
    score,
    matched,
    missing,
    synonymMatched
  };
}