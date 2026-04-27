import { ParsedDocument } from '../parser/index';
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
    hasMultipleColumns: doc.metadata.hasColumns,
    hasTables: doc.metadata.hasTables,
    hasImages: doc.metadata.hasGraphics,
    pageCount: doc.metadata.pageCount,
    wordCount: doc.metadata.wordCount,
    resumeText: doc.text,
    resumeSections: doc.sections.map((s) => s.type.toLowerCase()),
    experienceBullets: doc.sections
      .filter((s) => s.type === 'EXPERIENCE')
      .map((s) => s.content.split('\n'))
      .flat(),
    jobDescription: jobDescription,
    resumeSkills: doc.sections
      .filter((s) => s.type === 'SKILLS')
      .map((s) => s.content.split('\n'))
      .flat()
  };

  const formatting = scoreFormatting(scoringInput, strictness);
  const keywordMatch = scoreKeywords(doc, jobDescription);
  const sections = scoreSections(
    doc.sections.map((s) => s.type),
    profile?.requiredSections || ['EXPERIENCE', 'EDUCATION', 'SKILLS']
  );
  const experience = scoreExperience(doc);
  const education = scoreEducation(doc);

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
    education.score * weights.educationMatch -
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
