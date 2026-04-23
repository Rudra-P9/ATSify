import type { ResumeMetadata } from '../gemini';
import { SYNONYM_MAP, REVERSE_SYNONYM_MAP, canonicalize, getSynonyms } from './synonyms';

export type KeywordStrategy = 'exact' | 'fuzzy' | 'semantic';

// ---------------------------------------------------------------------------
// Return-type interfaces for each dimension
// ---------------------------------------------------------------------------
export interface D1Result {
  score: number;
  issues: string[];
}
export interface D2Result {
  score: number;
  matched: string[];
  missing: string[];
  synonyms: string[];
}
export interface D3Result {
  score: number;
  present: string[];
  missing: string[];
}
export interface D4Result {
  score: number;
  highlights: string[];
  quantifiedBullets: number;
  totalBullets: number;
  actionVerbCount: number;
}
export interface D5Result {
  score: number;
  notes: string[];
}
export interface D6Result {
  score: number;
  ratio: number;
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const ACTION_VERBS = new Set([
  'achieved', 'administered', 'analyzed', 'architected', 'automated', 'built',
  'collaborated', 'coordinated', 'created', 'defined', 'delivered', 'designed',
  'developed', 'directed', 'drove', 'enhanced', 'established', 'executed',
  'facilitated', 'generated', 'grew', 'guided', 'implemented', 'improved',
  'increased', 'initiated', 'launched', 'led', 'managed', 'mentored', 'migrated',
  'negotiated', 'optimized', 'oversaw', 'partnered', 'planned', 'produced',
  'reduced', 'refactored', 'resolved', 'scaled', 'shipped', 'spearheaded',
  'streamlined', 'supported', 'transformed', 'upgraded', 'utilized',
]);

const REQUIRED_SECTIONS  = ['contact', 'experience', 'education', 'skills'];
const BONUS_SECTIONS     = ['summary', 'certifications', 'projects', 'awards', 'publications', 'volunteer'];

// Degree keywords for d5
const DEGREE_TERMS = ['bachelor', 'b.s', 'bs', 'b.a', 'ba', 'master', 'm.s', 'ms', 'm.a', 'ma', 'mba', 'phd', 'ph.d', 'doctorate', 'associate'];

// Generic professional terms that lift the no-JD keyword quality score
const GENERAL_PROFESSIONAL_TERMS = [
  'managed', 'developed', 'designed', 'implemented', 'analyzed', 'increased',
  'reduced', 'improved', 'achieved', 'led', 'created', 'built', 'delivered',
  'coordinated', 'optimized', 'launched', 'collaborated', 'streamlined',
  'established', 'facilitated', 'spearheaded',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Extract bullet lines (lines starting with common bullet chars or hyphens). */
function extractBullets(resumeText: string): string[] {
  return resumeText
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^[-•·▪◦▸►‣*]/.test(l) || /^\d+\.\s/.test(l));
}

/** Return the first word (lower-cased) of a line. */
function firstWord(line: string): string {
  return line.replace(/^[-•·▪◦▸►‣*\d. ]+/, '').split(/\s+/)[0]?.toLowerCase() ?? '';
}

/** Extract meaningful keyword tokens from arbitrary text. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#+./\-\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2);
}

/** Extract unique keyword phrases (1-gram + 2-gram) from text for JD matching. */
function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'are', 'you', 'our', 'will',
    'from', 'have', 'has', 'not', 'but', 'all', 'can', 'its', 'also', 'any',
    'we', 'in', 'to', 'of', 'a', 'an', 'is', 'be', 'at', 'by', 'or', 'as',
    'it', 'on', 'if', 'up', 'so', 'do', 'no', 'my', 'me', 'us', 'he', 'she',
  ]);
  const unigrams = tokens.filter(t => t.length >= 3 && !STOP_WORDS.has(t));
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 1])) {
      bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }
  return [...new Set([...unigrams, ...bigrams])];
}

// ---------------------------------------------------------------------------
// d1 – Formatting
// ---------------------------------------------------------------------------

export function scoreFormatting(resumeText: string, meta: ResumeMetadata, sigma: number): D1Result {
  const lines = resumeText.split('\n');
  const issues: string[] = [];
  let penalty = 0;

  if (meta.checkmarks.multiColumn) {
    issues.push('Multi-column layout detected (may confuse ATS parsers)');
    penalty += 15;
  }
  if (meta.checkmarks.tables) {
    issues.push('Table formatting detected (ATS may misparse table cells)');
    penalty += 12;
  }
  if (meta.checkmarks.images) {
    issues.push('Image/graphic placeholders detected');
    penalty += 8;
  }

  // Estimate pages: ~450 words per page
  const estimatedPages = Math.ceil(meta.wordCount / 450);
  if (estimatedPages > 2) {
    issues.push(`Resume likely exceeds 2 pages (~${estimatedPages} pages estimated)`);
    penalty += 5;
  }

  if (meta.wordCount < 150) {
    issues.push('Resume is too short (under 150 words)');
    penalty += 10;
  } else if (meta.wordCount > 1500) {
    issues.push('Resume is too long (over 1500 words)');
    penalty += 3;
  }

  // Special character ratio: non-alphanumeric-non-whitespace chars
  const totalChars = resumeText.length;
  const specialChars = (resumeText.match(/[^a-zA-Z0-9\s]/g) ?? []).length;
  const specialRatio = totalChars > 0 ? specialChars / totalChars : 0;
  if (specialRatio > 0.08) {
    issues.push('High density of special characters detected');
    penalty += 8;
  }

  // All-caps lines (more than 2 short non-trivial lines in all caps)
  const allCapsLines = lines.filter(l => {
    const t = l.trim();
    return t.length > 4 && t === t.toUpperCase() && /[A-Z]/.test(t);
  });
  if (allCapsLines.length > 2) {
    issues.push('Multiple all-caps lines detected');
    penalty += 3;
  }

  // Inconsistent bullet symbols
  const bulletSymbols = new Set(
    lines
      .map(l => l.trim().match(/^([-•·▪◦▸►‣*]|\d+\.)/)?.[0])
      .filter(Boolean)
  );
  if (bulletSymbols.size > 3) {
    issues.push('Inconsistent bullet point symbols detected');
    penalty += 2;
  }

  const score = clamp(0, 100, 100 - penalty * sigma);
  return { score, issues };
}

// ---------------------------------------------------------------------------
// d2 – Keyword Match
// ---------------------------------------------------------------------------

export function scoreKeywordMatch(
  resumeText: string,
  meta: ResumeMetadata,
  jobDescription: string | undefined,
  strategy: KeywordStrategy,
): D2Result {
  if (!jobDescription || !jobDescription.trim()) {
    return scoreKeywordMatchNoJD(resumeText, meta);
  }

  const jdKeywords = extractKeywords(jobDescription);
  if (jdKeywords.length === 0) {
    return scoreKeywordMatchNoJD(resumeText, meta);
  }

  const resumeTokenSet = new Set(tokenize(resumeText));
  const resumeLower = resumeText.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];
  const synonymMatches: string[] = [];

  for (const kw of jdKeywords) {
    const inResume = resumeLower.includes(kw);

    if (inResume) {
      matched.push(kw);
      continue;
    }

    if (strategy === 'exact') {
      missing.push(kw);
      continue;
    }

    // Fuzzy: check synonym map
    const canonical = canonicalize(kw);
    const allForms = getSynonyms(canonical);
    const synonymFound = allForms.some(f => resumeLower.includes(f));

    if (synonymFound) {
      synonymMatches.push(kw);
      continue;
    }

    if (strategy === 'semantic') {
      // Partial containment: kw length >= 3, contained in a resume token
      const kwTokens = kw.split(/\s+/);
      const partialFound = kwTokens.every(part =>
        part.length >= 3 && [...resumeTokenSet].some(rt => rt.includes(part) || part.includes(rt))
      );
      if (partialFound && kw.length >= 3) {
        synonymMatches.push(kw);
        continue;
      }
    }

    missing.push(kw);
  }

  const J = jdKeywords.length;
  const M = matched.length;
  const S = strategy === 'exact' ? 0 : synonymMatches.length;
  const score = clamp(0, 100, ((M + 0.8 * S) / J) * 100);

  return { score, matched, missing, synonyms: strategy === 'exact' ? [] : synonymMatches };
}

function scoreKeywordMatchNoJD(resumeText: string, meta: ResumeMetadata): D2Result {
  const lower = resumeText.toLowerCase();

  // Score based on skill density + professional action terms
  const skillScore  = clamp(0, 55, meta.skills.length * 5);
  const termCount   = GENERAL_PROFESSIONAL_TERMS.filter(t => lower.includes(t)).length;
  const termBonus   = clamp(0, 20, termCount * 2);
  const wdBonus     = (meta.wordCount >= 250 && meta.wordCount <= 1500) ? 10 : 0;
  const sectionBonus = meta.sections.length >= 4 ? 5 : 0;

  const score = clamp(0, 75, skillScore + termBonus + wdBonus + sectionBonus);

  return {
    score,
    matched: meta.skills.slice(0, 12),
    missing: [],
    synonyms: [],
  };
}

// ---------------------------------------------------------------------------
// d3 – Section Completeness
// ---------------------------------------------------------------------------

export function scoreSections(meta: ResumeMetadata): D3Result {
  const presentSections = new Set(meta.sections);

  const present: string[] = [];
  const missingRequired: string[] = [];

  for (const req of REQUIRED_SECTIONS) {
    if (presentSections.has(req)) {
      present.push(req);
    } else {
      missingRequired.push(req);
    }
  }

  const bonusPresent: string[] = [];
  for (const bonus of BONUS_SECTIONS) {
    if (presentSections.has(bonus)) {
      bonusPresent.push(bonus);
      present.push(bonus);
    }
  }

  // 4 required × 20 pts each = 80 pts max; up to 20 bonus pts
  const requiredScore = (present.filter(s => REQUIRED_SECTIONS.includes(s)).length / REQUIRED_SECTIONS.length) * 80;
  const bonusScore    = clamp(0, 20, bonusPresent.length * 7);
  const score         = clamp(0, 100, requiredScore + bonusScore);

  return { score, present, missing: missingRequired };
}

// ---------------------------------------------------------------------------
// d4 – Experience Relevance
// ---------------------------------------------------------------------------

export function scoreExperience(
  resumeText: string,
  meta: ResumeMetadata,
  jobDescription?: string,
  _currentYear: number = new Date().getFullYear(),
): D4Result {
  const bullets = extractBullets(resumeText);
  const totalBullets = bullets.length;

  // Action verb count
  let actionVerbCount = 0;
  for (const bullet of bullets) {
    const fw = firstWord(bullet);
    if (ACTION_VERBS.has(fw)) actionVerbCount++;
  }

  // Quantified bullets: bullets containing at least one number
  const quantifiedBullets = bullets.filter(b => /\d/.test(b)).length;

  // Recency signal: mentions of recent years
  const recentYears = [_currentYear, _currentYear - 1, _currentYear - 2, _currentYear - 3];
  const hasRecency  = recentYears.some(y => resumeText.includes(String(y)));

  // Role title match (if JD provided)
  let roleTitleBonus = 0;
  if (jobDescription) {
    const jdLower = jobDescription.toLowerCase();
    const titleWords = jdLower.match(/\b(engineer|developer|manager|analyst|designer|architect|lead|senior|junior|staff|principal)\b/g) ?? [];
    const resumeLower = resumeText.toLowerCase();
    roleTitleBonus = titleWords.filter(w => resumeLower.includes(w)).length > 0 ? 10 : 0;
  }

  // Highlights: top 3 quantified bullets
  const highlights = bullets.filter(b => /\d/.test(b)).slice(0, 3);

  // Score components
  const verbRatio    = totalBullets > 0 ? actionVerbCount / totalBullets : 0;
  const quantRatio   = totalBullets > 0 ? quantifiedBullets / totalBullets : 0;
  const verbScore    = clamp(0, 40, verbRatio * 40);
  const quantScore   = clamp(0, 30, quantRatio * 30);
  const recencyScore = hasRecency ? 15 : 0;
  const bulletScore  = totalBullets > 0 ? clamp(0, 15, Math.min(15, totalBullets * 1.5)) : 0;

  const score = clamp(0, 100, verbScore + quantScore + recencyScore + bulletScore + roleTitleBonus);

  return { score, highlights, quantifiedBullets, totalBullets, actionVerbCount };
}

// ---------------------------------------------------------------------------
// d5 – Education Match
// ---------------------------------------------------------------------------

export function scoreEducation(resumeText: string, _meta: ResumeMetadata, jobDescription?: string): D5Result {
  const lower = resumeText.toLowerCase();
  const notes: string[] = [];
  let score = 30; // baseline for any mention of education-related content

  // Detect degree level
  const hasDegree = DEGREE_TERMS.some(d => lower.includes(d));
  if (hasDegree) {
    score += 30;
    notes.push('Degree detected');
  }

  // Detect graduation year
  const gradYearMatch = resumeText.match(/\b(19|20)\d{2}\b/);
  if (gradYearMatch) {
    score += 10;
    notes.push(`Year detected: ${gradYearMatch[0]}`);
  }

  // Detect institution (heuristic: line after degree keyword or contains University/College)
  const institutionMatch = resumeText.match(/\b(university|college|institute|school)\b/i);
  if (institutionMatch) {
    score += 15;
    notes.push('Institution name detected');
  }

  // If JD provided, check for degree requirements
  if (jobDescription) {
    const jdLower = jobDescription.toLowerCase();
    const requiresDegree = DEGREE_TERMS.some(d => jdLower.includes(d));
    if (requiresDegree && hasDegree) {
      score += 15;
      notes.push('Meets degree requirement from job description');
    } else if (requiresDegree && !hasDegree) {
      score -= 10;
      notes.push('Job description requires a degree not found in resume');
    }
  }

  return { score: clamp(0, 100, score), notes };
}

// ---------------------------------------------------------------------------
// d6 – Quantification
// ---------------------------------------------------------------------------

export function scoreQuantification(resumeText: string, _meta: ResumeMetadata): D6Result {
  const bullets = extractBullets(resumeText);
  if (bullets.length === 0) {
    return { score: 0, ratio: 0 };
  }
  const quantifiedBullets = bullets.filter(b => /\d/.test(b)).length;
  const ratio = quantifiedBullets / bullets.length;
  const score = clamp(0, 100, ratio * 100);
  return { score, ratio: Math.round(ratio * 100) / 100 };
}
