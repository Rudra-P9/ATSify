import type { ATSProfile, ScoringInput, ScoreResult, ScoreBreakdown } from './types';
import { PLATFORMS } from '../platforms/index';
import { scoreFormatting } from './formatScorer';
import { scoreSections } from './sectionScorer';
import { scoreExperience } from './experienceScorer';
import { scoreEducation } from './educationScorer';
import { matchKeywords } from './keywordScorer';
import { parseText } from '../parser/index';
import type { AnalysisResponse, ATSResult } from '../gemini';

/**
 * Adapter: converts ScoreResult[] -> ATSResult[] for UI compatibility.
 */
function adaptScorerResults(scoreResults: ScoreResult[]): ATSResult[] {
  return scoreResults.map(result => ({
    system: result.system,
    vendor: result.vendor,
    overallScore: result.overallScore,
    passesFilter: result.passesFilter,
    breakdown: result.breakdown,
    suggestions: result.suggestions.map(s => ({
      summary: s,
      details: [s],
      impact: s.toLowerCase().includes('missing') ? 'critical' : 'medium',
      platforms: [result.system]
    })),
    engineUsed: 'deterministic-fallback' as const
  }));
}

/**
 * Run the deterministic scoring engine and return a fully-formed
 * AnalysisResponse compatible with the UI schema.
 */
export function runDeterministicEngine(
  resumeText: string,
  jobDescription?: string,
): AnalysisResponse {
  const doc = parseText(resumeText);
  
  // Transform to ResumeMetadata as expected by gemini namespace
  const metadata = {
    wordCount: doc.metadata.wordCount,
    sections: doc.sections.map(s => s.type),
    skills: doc.skills,
    positions: doc.experience.length,
    education: doc.education.map(e => e.degree ? `${e.degree} in ${e.field}`.trim() : e.rawText),
    contactInfo: {
      name: doc.contact.name,
      email: doc.contact.email,
      phone: doc.contact.phone,
      linkedin: doc.contact.linkedin,
      location: doc.contact.location
    },
    checkmarks: {
      multiColumn: doc.metadata.hasMultipleColumns,
      tables: doc.metadata.hasTables,
      images: doc.metadata.hasImages
    }
  };

  // Build input for the scorer
  const input: ScoringInput = {
    hasMultipleColumns: metadata.checkmarks.multiColumn,
    hasTables: metadata.checkmarks.tables,
    hasImages: metadata.checkmarks.images,
    pageCount: doc.metadata.pageCount,
    wordCount: metadata.wordCount,
    resumeText,
    resumeSections: metadata.sections,
    experienceBullets: doc.experience.flatMap(e => e.bullets),
    experienceEntries: doc.experience,
    educationText: doc.education.map(e => e.rawText).join('\n\n'),
    educationEntries: doc.education,
    jobDescription,
    resumeSkills: metadata.skills
  };

  const results = scoreResume(input);

  return { 
    results: adaptScorerResults(results), 
    metadata 
  };
}

// scores a resume against all ATS profiles. deterministic: same input = same output
export function scoreResume(input: ScoringInput): ScoreResult[] {
  return PLATFORMS.map((profile) => scoreAgainstProfile(input, profile));
}

// scores a resume against a single ATS profile
export function scoreAgainstProfile(input: ScoringInput, profile: ATSProfile): ScoreResult {
  const breakdown = computeBreakdown(input, profile);
  const weightedScore = computeWeightedScore(breakdown, profile);

  // apply quirk penalties/bonuses
  const quirkAdjustment = computeQuirkAdjustment(input, profile);
  let overallScore = weightedScore + quirkAdjustment.totalAdjustment;

  // Platform differentiation is handled through weights and quirk functions.
  // Do NOT add hardcoded bonuses/penalties here — use profile.quirks instead.

  const finalScore = Math.max(
    0,
    Math.min(100, Math.round(overallScore))
  );

  const suggestions = generateSuggestions(breakdown, profile, quirkAdjustment.messages);

  return {
    system: profile.name,
    vendor: profile.vendor,
    overallScore: finalScore,
    passesFilter: finalScore >= profile.passingScore,
    breakdown,
    suggestions,
    engineUsed: 'deterministic-fallback'
  };
}

// runs each individual scorer and assembles the breakdown
function computeBreakdown(input: ScoringInput, profile: ATSProfile): ScoreBreakdown {
  const formatting = scoreFormatting(input, profile.parsingStrictness);
  const sections = scoreSections(input.resumeSections, profile.requiredSections);
  const experience = scoreExperience(input.experienceBullets);
  const education = scoreEducation(input.educationText);
  const keywords = matchKeywords(input, profile.keywordStrategy);

  return {
    formatting: {
      score: formatting.score,
      issues: formatting.issues,
      details: formatting.details
    },
    keywordMatch: {
      score: keywords.score,
      matched: keywords.matched,
      missing: keywords.missing,
      synonymMatched: keywords.synonymMatched
    },
    sections: {
      score: sections.score,
      present: sections.present,
      missing: sections.missing
    },
    experience: {
      score: experience.score,
      quantifiedBullets: experience.quantifiedBullets,
      totalBullets: experience.totalBullets,
      actionVerbCount: experience.actionVerbCount,
      highlights: experience.highlights
    },
    education: {
      score: education.score,
      notes: education.notes
    }
  };
}

// applies profile weights to produce a single 0-100 score
function computeWeightedScore(breakdown: ScoreBreakdown, profile: ATSProfile): number {
  const { weights } = profile;

  // quantification is derived from the experience scorer's quantification ratio
  const quantificationScore =
    breakdown.experience.totalBullets > 0
      ? Math.round(
        (breakdown.experience.quantifiedBullets / breakdown.experience.totalBullets) * 100
      )
      : 0;

  const weighted =
    breakdown.formatting.score * weights.formatting +
    breakdown.keywordMatch.score * weights.keywordMatch +
    breakdown.sections.score * weights.sectionCompleteness +
    breakdown.experience.score * weights.experienceRelevance +
    breakdown.education.score * weights.educationMatch +
    quantificationScore * weights.quantification;

  return weighted;
}

// runs quirk checks for a profile. negative penalty = bonus, positive = deduction
function computeQuirkAdjustment(
  input: ScoringInput,
  profile: ATSProfile
): { totalAdjustment: number; messages: string[] } {
  let totalAdjustment = 0;
  const messages: string[] = [];

  for (const quirk of profile.quirks) {
    const result = quirk.check(input);
    if (result) {
      totalAdjustment -= result.penalty;
      messages.push(result.message);
    }
  }

  return { totalAdjustment, messages };
}

// generates rule-based suggestions. LLM enhancement is layered on top separately
function generateSuggestions(
  breakdown: ScoreBreakdown,
  profile: ATSProfile,
  quirkMessages: string[]
): string[] {
  const suggestions: string[] = [];

  // formatting suggestions
  if (breakdown.formatting.score < 70) {
    if (breakdown.formatting.issues.some((i) => i.includes('multi-column'))) {
      suggestions.push('switch to a single-column resume layout for better ATS parsing');
    }
    if (breakdown.formatting.issues.some((i) => i.includes('tables'))) {
      suggestions.push('remove tables and use plain text formatting instead');
    }
    if (breakdown.formatting.issues.some((i) => i.includes('images'))) {
      suggestions.push('remove images, logos, and graphics from your resume');
    }
  }

  // keyword suggestions
  if (breakdown.keywordMatch.score < 60 && breakdown.keywordMatch.missing.length > 0) {
    const topMissing = breakdown.keywordMatch.missing.slice(0, 5);
    suggestions.push(
      `add these missing keywords from the job description: ${topMissing.join(', ')}`
    );

    if (profile.keywordStrategy === 'exact') {
      suggestions.push(
        `${profile.name} uses exact keyword matching. use the exact terms from the job posting, not synonyms.`
      );
    }
  }

  // section suggestions
  if (breakdown.sections.missing.length > 0) {
    suggestions.push(
      `add missing sections: ${breakdown.sections.missing.join(', ')}. ${profile.name} requires these for proper parsing.`
    );
  }

  // experience suggestions
  if (breakdown.experience.totalBullets > 0) {
    const quantRatio = breakdown.experience.quantifiedBullets / breakdown.experience.totalBullets;
    if (quantRatio < 0.3) {
      suggestions.push(
        'add more quantified achievements (numbers, percentages, dollar amounts) to your experience bullets'
      );
    }
    if (breakdown.experience.actionVerbCount / breakdown.experience.totalBullets < 0.5) {
      suggestions.push(
        'start more bullet points with strong action verbs (led, developed, increased, delivered)'
      );
    }
  } else {
    suggestions.push('add detailed experience bullets with measurable achievements');
  }

  // education suggestions
  if (breakdown.education.score < 50) {
    suggestions.push(
      'ensure your education section includes degree type, institution, and graduation date'
    );
  }

  // quirk-specific suggestions (from profile checks)
  for (const message of quirkMessages) {
    suggestions.push(message);
  }

  return suggestions;
}