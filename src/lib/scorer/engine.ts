import { ParsedDocument } from '../parser';
import { ScorerResult, ScoringWeights, ScoringInput } from './types';
import { scoreFormatting } from './formatScorer';
import { scoreKeywords } from './keywordScorer';
import { scoreSections } from './sectionScorer';
import { scoreExperience } from './experienceScorer';
import { scoreEducation } from './educationScorer';
import { ATSProfile } from '../platforms/types';
import { GLOBAL_BASELINE_WEIGHTS } from '../config/weights';

export function executeScoringEngine(
  doc: ParsedDocument,
  jobDescription?: string,
  profile?: ATSProfile
): ScorerResult {
  const weights = profile?.weights || GLOBAL_BASELINE_WEIGHTS;
  const strictness = profile?.parsingStrictness || 0.5;

  // Map ParsedDocument to ScoringInput
  const scoringInput: ScoringInput = {
    hasMultipleColumns: doc.metadata.hasMultipleColumns,
    hasTables: doc.metadata.hasTables,
    hasImages: doc.metadata.hasImages,
    pageCount: doc.metadata.pageCount,
    wordCount: doc.metadata.wordCount,
    resumeText: doc.rawText,
    resumeSections: doc.sections.map((s) => s.type.toLowerCase()),
    experienceBullets: doc.sections
      .filter((s) => s.type === 'experience')
      .map((s) => s.content.split('\n'))
      .flat(),
    jobDescription: jobDescription,
    resumeSkills: doc.sections
      .filter((s) => s.type === 'skills')
      .map((s) => s.content.split('\n'))
      .flat()
  };

  const formatting = scoreFormatting(scoringInput, strictness);
  const keywordMatch = scoreKeywords(doc, jobDescription);
  const sections = scoreSections(
    doc.sections.map((s) => s.type),
    profile?.requiredSections || (['experience', 'education', 'skills'] as any)
  );
  const experience = scoreExperience(doc);
  const education = scoreEducation(doc);

  // Calculate quantification score (0-100)
  const quantificationScore = experience.totalBullets > 0
    ? (experience.quantifiedBullets / experience.totalBullets) * 100
    : 0;

  // Apply quirks if profile exists
  let quirksDeductions = 0;
  if (profile?.quirks) {
    for (const quirk of profile.quirks) {
      const result = quirk.check(scoringInput);
      if (result) {
        quirksDeductions += result.penalty;
        formatting.notes.push(`${quirk.id}: ${result.message}`);
      }
    }
  }

  const overallScore = Math.round(
    formatting.score * weights.formatting +
    keywordMatch.score * weights.keywordMatch +
    sections.score * weights.sectionCompleteness +
    experience.score * weights.experienceRelevance +
    education.score * weights.educationMatch +
    quantificationScore * weights.quantification -
    quirksDeductions
  );

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    breakdown: {
      formatting,
      keywordMatch,
      sections,
      experience,
      education
    }
  };
}