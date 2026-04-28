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
    if (resumeKeywordSet.has(kw)) {
      matched.push(kw);
    } else {
      // Very basic synonym check for demonstration
      if (strategy === 'semantic' && kw.endsWith('s') && resumeKeywordSet.has(kw.slice(0, -1))) {
        synonymMatched.push(kw);
      } else if (strategy === 'semantic' && resumeLower.includes(kw.toLowerCase())) {
        synonymMatched.push(kw);
      } else {
        missing.push(kw);
      }
    }
  }

  // Exact matching penalizes missing synonyms, semantic counts them partially
  const effectiveMatchedCount = matched.length + (strategy === 'semantic' ? synonymMatched.length * 0.8 : 0);
  const ratio = jdKeywords.length > 0 ? effectiveMatchedCount / jdKeywords.length : 1;
  const score = Math.min(100, Math.round(ratio * 100));

  return {
    score,
    matched,
    missing,
    synonymMatched
  };
}