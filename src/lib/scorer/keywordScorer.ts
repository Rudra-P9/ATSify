import { ScoreComponent } from './types';
import { ParsedDocument } from '../parser';
import { extractKeywords } from '../nlp/keywordExtractor';

export function scoreKeywords(doc: ParsedDocument, jobDescription?: string): ScoreComponent {
  if (!jobDescription) {
    // If no JD, assume it meets basic generic NLP bounds for the industry
    return {
      score: 85,
      matched: ['Dynamic', 'Leadership', 'Management'],
      missing: [],
      notes: ['No job description provided; using generic scoring baseline.']
    };
  }

  const jdKeywords = extractKeywords(jobDescription);
  const resumeText = doc.text.toLowerCase();
  
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    if (resumeText.includes(kw.toLowerCase())) {
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
