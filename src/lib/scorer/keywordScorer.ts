import type { ScoreBreakdown, ScoringInput } from './types';
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
 * Nuanced scoring based on frequency, placement, and strategy.
 */
export function matchKeywords(
  input: ScoringInput,
  strategy: 'exact' | 'fuzzy' | 'semantic'
): ScoreBreakdown['keywordMatch'] {
  const { resumeText, jobDescription, resumeSkills, experienceBullets } = input;

  if (!jobDescription) {
    // No JD (General Readiness mode): score based on resume's own keyword density and depth.
    const resumeKeywords = extractKeywords(resumeText);
    const baseScore = 20;
    
    // Evaluate depth: keywords in experience bullets carry more weight
    const bulletText = experienceBullets.join(' ').toLowerCase();
    const experienceMatchedCount = resumeKeywords.filter(kw => 
      new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`, 'i').test(bulletText)
    ).length;

    const strategyMultiplier = strategy === 'semantic' ? 1.2 : strategy === 'fuzzy' ? 1.0 : 0.8;
    const densityScore = Math.min(50, resumeKeywords.length * 3 * strategyMultiplier);
    const depthBonus = Math.min(10, experienceMatchedCount * 2);
    
    const score = Math.min(80, Math.round(baseScore + densityScore + depthBonus));
    return {
      score,
      matched: resumeKeywords.slice(0, 20), // Limit for UI display
      missing: [],
      synonymMatched: []
    };
  }

  const jdKeywords = extractKeywords(jobDescription);
  // Count frequency of keywords in JD to determine relevance/importance
  const jdKeywordImportance: Record<string, number> = {};
  jdKeywords.forEach(kw => {
    const count = (jobDescription.match(new RegExp(escapeRegex(kw), 'gi')) || []).length;
    jdKeywordImportance[kw.toLowerCase()] = Math.min(3, count); // Cap at 3 for weighting
  });

  const matched: string[] = [];
  const missing: string[] = [];
  const synonymMatched: string[] = [];
  
  let weightedRequired = 0;
  let weightedAchieved = 0;

  const lowResumeText = resumeText.toLowerCase();
  const lowSkillsText = resumeSkills.join(' ').toLowerCase();
  const lowBulletsText = experienceBullets.join(' ').toLowerCase();

  for (const kw of jdKeywords) {
    const kwLower = kw.toLowerCase();
    const importance = jdKeywordImportance[kwLower] || 1;
    weightedRequired += importance;

    let found = false;
    let matchType: 'exact' | 'synonym' | 'none' = 'none';
    let placementWeight = 0.5; // Default raw text weight

    // 1. Placement verification and weighting
    // Bullets (Experience) = 1.0 weight
    // Skills section = 0.8 weight
    // General text = 0.5 weight
    
    const checkMatch = (targetText: string, searchKw: string): boolean => {
      return wordMatch(targetText, searchKw);
    };

    // Try exact matches first
    if (checkMatch(lowBulletsText, kwLower)) {
      found = true;
      matchType = 'exact';
      placementWeight = 1.0;
    } else if (checkMatch(lowSkillsText, kwLower)) {
      found = true;
      matchType = 'exact';
      placementWeight = 0.8;
    } else if (checkMatch(lowResumeText, kwLower)) {
      found = true;
      matchType = 'exact';
      placementWeight = 0.5;
    }

    // 2. Strategy-specific fallback (Synonyms)
    if (!found && (strategy === 'fuzzy' || strategy === 'semantic')) {
      const canonical = getCanonical(kwLower);
      const synonyms = getSynonyms(canonical);
      
      for (const syn of synonyms) {
        if (checkMatch(lowBulletsText, syn)) {
          found = true;
          matchType = 'synonym';
          placementWeight = 0.9; // Slight penalty for synonym but high placement
          break;
        } else if (checkMatch(lowSkillsText, syn)) {
          found = true;
          matchType = 'synonym';
          placementWeight = 0.7;
          break;
        } else if (checkMatch(lowResumeText, syn)) {
          found = true;
          matchType = 'synonym';
          placementWeight = 0.4;
          break;
        }
      }

      if (!found && strategy === 'semantic') {
        const stemmed = kwLower.replace(/(?:ing|ed|s|tion|ment)$/, '');
        if (stemmed !== kwLower && stemmed.length >= 3) {
          if (checkMatch(lowResumeText, stemmed)) {
            found = true;
            matchType = 'synonym';
            placementWeight = 0.3; // Stems are weaker matches
          }
        }
      }
    }

    // 3. Exact mode simple plural tolerance fallback
    if (!found && strategy === 'exact') {
      const variations = kwLower.endsWith('s') ? [kwLower.slice(0, -1)] : [kwLower + 's'];
      for (const varKw of variations) {
        if (checkMatch(lowResumeText, varKw)) {
          found = true;
          matchType = 'synonym';
          placementWeight = 0.4;
          break;
        }
      }
    }

    if (found) {
      if (matchType === 'exact') matched.push(kw);
      else synonymMatched.push(kw);

      // Strategy bonus for accuracy
      const strategyBonus = strategy === 'exact' ? 1.0 : strategy === 'fuzzy' ? 0.95 : 0.9;
      
      // Calculate credit for this specific keyword
      // Frequency bonus: if it appears multiple times in resume, give slight boost
      const resumeFreq = (lowResumeText.match(new RegExp(escapeRegex(kwLower), 'gi')) || []).length;
      const freqBonus = Math.min(0.1, (resumeFreq - 1) * 0.02);

      weightedAchieved += importance * placementWeight * strategyBonus + (found ? freqBonus : 0);
    } else {
      missing.push(kw);
    }
  }

  const score = weightedRequired > 0 
    ? Math.max(0, Math.min(100, Math.round((weightedAchieved / weightedRequired) * 100)))
    : 100;

  return {
    score,
    matched,
    missing,
    synonymMatched
  };
}
