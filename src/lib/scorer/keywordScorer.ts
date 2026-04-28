import type { ScoreBreakdown } from './types';
import { extractKeywords } from '../nlp/keywordExtractor';

export function matchKeywords(
  resumeText: string,
  jobDescription: string,
  strategy: 'exact' | 'semantic'
): ScoreBreakdown['keywordMatch'] {
  if (!jobDescription) {
    return {
      score: 85,
      matched: ['Dynamic', 'Leadership', 'Management'],
      missing: [],
      synonymMatched: []
    };
  }

  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywordSet = new Set(extractKeywords(resumeText));
  const resumeLower = resumeText.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];
  const synonymMatched: string[] = [];

  for (const kw of jdKeywords) {
    const kwLower = kw.toLowerCase();
    if (resumeKeywordSet.has(kw)) {
      matched.push(kw);
    } else {
      // Semantic check
      if (strategy === 'semantic') {
        // More robust semantic matching for Greenhouse/iCIMS
        const isFuzzyMatch = resumeLower.includes(kwLower) ||
          resumeLower.includes(kwLower.replace(/s$/, '')) ||
          (kwLower.length > 5 && resumeLower.includes(kwLower.substring(0, 5)));

        if (isFuzzyMatch) {
          synonymMatched.push(kw);
        } else {
          missing.push(kw);
        }
      } else {
        // Exact matching for Taleo/Workday
        // We only allow plurals as "tolerable" synonyms in exact mode but with heavy penalty
        if (kw.endsWith('s') && resumeKeywordSet.has(kw.slice(0, -1))) {
          synonymMatched.push(kw);
        } else {
          missing.push(kw);
        }
      }
    }
  }

  // Exact matching penalizes missing synonyms heavily, semantic counts them near-fully
  const synonymWeight = strategy === 'semantic' ? 0.95 : 0.2;
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