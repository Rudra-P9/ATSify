import { ParsedDocument } from '../parser';
import { ScorerResult, ScoringWeights } from './types';
import { scoreFormatting } from './formatScorer';
import { scoreKeywords } from './keywordScorer';
import { scoreSections } from './sectionScorer';
import { scoreExperience } from './experienceScorer';
import { scoreEducation } from './educationScorer';

// Default Weights
const DEFAULT_WEIGHTS: ScoringWeights = {
  formatting: 0.20,
  keywordMatch: 0.35,
  sections: 0.15,
  experience: 0.20,
  education: 0.10
};

export function executeScoringEngine(doc: ParsedDocument, jobDescription?: string, weights: ScoringWeights = DEFAULT_WEIGHTS): ScorerResult {
  const formatting = scoreFormatting(doc);
  const keywordMatch = scoreKeywords(doc, jobDescription);
  const sections = scoreSections(doc);
  const experience = scoreExperience(doc);
  const education = scoreEducation(doc);

  const overallScore = Math.round(
    (formatting.score * weights.formatting) +
    (keywordMatch.score * weights.keywordMatch) +
    (sections.score * weights.sections) +
    (experience.score * weights.experience) +
    (education.score * weights.education)
  );

  return {
    overallScore,
    breakdown: {
      formatting,
      keywordMatch,
      sections,
      experience,
      education
    }
  };
}
