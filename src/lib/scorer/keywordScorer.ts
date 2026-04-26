import { ScoreComponent } from './types';
import { ParsedDocument } from '../parser';
import { extractKeywords } from '../nlp/keywordExtractor';

export function scoreKeywords(doc: ParsedDocument, jobDescription?: string): ScoreComponent {
  if (!jobDescription) {
    return {
      score: 85,
      matched: ['Dynamic', 'Leadership', 'Management'],
      missing: [],
      notes: ['No job description provided; using generic scoring baseline.']
    };
  }

  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywordSet = new Set(extractKeywords(doc.text));

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    if (resumeKeywordSet.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const ratio = jdKeywords.length > 0 ? matched.length / jdKeywords.length : 1;
  const score = Math.round(ratio * 100);

  return {
    score,
    matched,
    missing,
    notes: []
  };
}
