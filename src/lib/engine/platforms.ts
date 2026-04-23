import type { ATSResult, ResumeMetadata } from '../gemini';
import type { KeywordStrategy } from './dimensions';
import type { D1Result, D2Result, D3Result, D4Result, D5Result, D6Result } from './dimensions';
import {
  scoreFormatting,
  scoreKeywordMatch,
  scoreSections,
  scoreExperience,
  scoreEducation,
  scoreQuantification,
} from './dimensions';

// ---------------------------------------------------------------------------
// Platform profile definition
// ---------------------------------------------------------------------------

interface PlatformProfile {
  name: string;
  vendor: string;
  weights: [number, number, number, number, number, number]; // w1..w6
  sigma: number;
  passing: number;
  strategy: KeywordStrategy;
  quirks: Array<(meta: ResumeMetadata, d2: D2Result, d3: D3Result) => number>;
}

// ---------------------------------------------------------------------------
// Platform configurations
// ---------------------------------------------------------------------------

/** Standard section headers recognised by strict platforms. */
const STANDARD_SECTION_HEADERS = new Set([
  'contact', 'summary', 'experience', 'education', 'skills',
  'certifications', 'projects', 'awards', 'publications', 'volunteer', 'languages', 'references',
]);

const PLATFORMS: PlatformProfile[] = [
  {
    name: 'Workday',
    vendor: 'Workday Inc.',
    weights: [0.25, 0.30, 0.15, 0.15, 0.10, 0.05],
    sigma: 0.90,
    passing: 70,
    strategy: 'exact',
    quirks: [
      // Non-standard headers > 2 unrecognised => -5
      (meta) => {
        const unrecognised = meta.sections.filter(s => !STANDARD_SECTION_HEADERS.has(s)).length;
        return unrecognised > 2 ? -5 : 0;
      },
      // Pages > 2 => -8
      (meta) => Math.ceil(meta.wordCount / 450) > 2 ? -8 : 0,
    ],
  },
  {
    name: 'Taleo',
    vendor: 'Oracle Taleo',
    weights: [0.20, 0.35, 0.15, 0.15, 0.10, 0.05],
    sigma: 0.85,
    passing: 75,
    strategy: 'exact',
    quirks: [
      // Low skill density (< 5 skills detected with JD) => -10
      (meta, d2) => {
        const jdActive = d2.matched.length + d2.missing.length > 0;
        return (jdActive && meta.skills.length < 5) ? -10 : 0;
      },
      // Missing standard sections (> 1 required missing) => -8
      (_meta, _d2, d3) => d3.missing.length > 1 ? -8 : 0,
    ],
  },
  {
    name: 'iCIMS',
    vendor: 'iCIMS',
    weights: [0.15, 0.30, 0.15, 0.20, 0.10, 0.10],
    sigma: 0.60,
    passing: 60,
    strategy: 'fuzzy',
    quirks: [],
  },
  {
    name: 'Greenhouse',
    vendor: 'Greenhouse Software',
    weights: [0.10, 0.25, 0.10, 0.25, 0.10, 0.20],
    sigma: 0.40,
    passing: 50,
    strategy: 'semantic',
    quirks: [],
  },
  {
    name: 'Lever',
    vendor: 'Lever Inc.',
    weights: [0.08, 0.22, 0.10, 0.30, 0.10, 0.20],
    sigma: 0.35,
    passing: 50,
    strategy: 'semantic',
    quirks: [],
  },
  {
    name: 'SuccessFactors',
    vendor: 'SAP SuccessFactors',
    weights: [0.25, 0.25, 0.20, 0.15, 0.10, 0.05],
    sigma: 0.85,
    passing: 65,
    strategy: 'exact',
    quirks: [],
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

interface PlatformComputed {
  platform: PlatformProfile;
  d1: D1Result;
  d2: D2Result;
  d3: D3Result;
  d4: D4Result;
  d5: D5Result;
  d6: D6Result;
  dims: [number, number, number, number, number, number];
  overallScore: number;
}

// ---------------------------------------------------------------------------
// Suggestions builder
// ---------------------------------------------------------------------------

function buildSuggestions(
  pc: PlatformComputed,
): ATSResult['suggestions'] {
  const suggestions: ATSResult['suggestions'] = [];

  const add = (text: string, priority: 'HIGH' | 'MEDIUM' | 'LOW') =>
    suggestions.push({ text, priority, platforms: [pc.platform.name] });

  const [d1, d2, d3, d4, d5, d6] = pc.dims;

  if (d1 < 50) add('Fix formatting: remove multi-column layouts, tables, or images that ATS cannot parse', 'HIGH');
  else if (d1 < 70) add('Reduce use of special characters and ensure consistent bullet formatting', 'MEDIUM');

  if (d2 < 40) add('Significantly expand keyword alignment with the job description', 'HIGH');
  else if (d2 < 65) add('Add more role-specific keywords from the job description', 'MEDIUM');
  else if (d2 < 80) add('Fine-tune keyword placement to match exact phrasing in the JD', 'LOW');

  if (d3 < 60) {
    const mis = pc.d3.missing;
    if (mis.length > 0) add(`Add missing sections: ${mis.join(', ')}`, 'HIGH');
  } else if (d3 < 80) add('Consider adding a Summary or Certifications section for completeness', 'MEDIUM');

  if (d4 < 50) add('Strengthen experience bullets with action verbs and measurable achievements', 'HIGH');
  else if (d4 < 70) add('Add more quantified achievements (numbers, percentages, dollar amounts)', 'MEDIUM');

  if (d5 < 50) add('Ensure education section clearly states degree, institution, and graduation year', 'MEDIUM');

  if (d6 < 30) add('Add quantified results to at least 30% of your experience bullets', 'HIGH');
  else if (d6 < 50) add('Increase the proportion of bullet points with measurable outcomes', 'MEDIUM');

  return suggestions;
}

// ---------------------------------------------------------------------------
// focusAreas builder (requires all platform results to compute platformAvg)
// ---------------------------------------------------------------------------

function buildFocusAreas(
  pc: PlatformComputed,
  allPlatformDims: Array<[number, number, number, number, number, number]>,
): ATSResult['focusAreas'] {
  const labels = ['Formatting', 'Keywords', 'Sections', 'Experience', 'Education', 'Quantification'];
  return labels.map((label, i) => {
    const platformAvg = allPlatformDims.reduce((sum, dims) => sum + dims[i], 0) / allPlatformDims.length;
    return {
      label,
      score: Math.round(pc.dims[i]),
      platformAvg: Math.round(platformAvg),
    };
  });
}

// ---------------------------------------------------------------------------
// Main public function
// ---------------------------------------------------------------------------

export function computeAllPlatforms(
  resumeText: string,
  metadata: ResumeMetadata,
  jobDescription?: string,
): ATSResult[] {
  // Pre-compute platform-independent dimensions
  const d3 = scoreSections(metadata);
  const d4 = scoreExperience(resumeText, metadata, jobDescription);
  const d5 = scoreEducation(resumeText, metadata, jobDescription);
  const d6 = scoreQuantification(resumeText, metadata);

  // Compute per-platform dimensions
  const computed: PlatformComputed[] = PLATFORMS.map(platform => {
    const d1 = scoreFormatting(resumeText, metadata, platform.sigma);
    const d2 = scoreKeywordMatch(resumeText, metadata, jobDescription, platform.strategy);

    const dims: [number, number, number, number, number, number] = [
      d1.score, d2.score, d3.score, d4.score, d5.score, d6.score,
    ];

    // Quirk penalties (all <= 0)
    const quirkyPenalty = platform.quirks.reduce((sum, q) => sum + q(metadata, d2, d3), 0);

    const weightedSum = platform.weights.reduce((sum, w, i) => sum + w * dims[i], 0);
    const overallScore = clamp(0, 100, weightedSum + quirkyPenalty);

    return { platform, d1, d2, d3, d4, d5, d6, dims, overallScore };
  });

  // All dimension arrays for platformAvg calculation
  const allDims = computed.map(pc => pc.dims);

  // Build ATSResult objects
  return computed.map(pc => ({
    system: pc.platform.name,
    vendor: pc.platform.vendor,
    overallScore: Math.round(pc.overallScore),
    passesFilter: pc.overallScore >= pc.platform.passing,
    breakdown: {
      formatting:   { score: Math.round(pc.d1.score), issues: pc.d1.issues },
      keywordMatch: { score: Math.round(pc.d2.score), matched: pc.d2.matched, missing: pc.d2.missing, synonyms: pc.d2.synonyms },
      sections:     { score: Math.round(pc.d3.score), present: pc.d3.present, missing: pc.d3.missing },
      experience:   { score: Math.round(pc.d4.score), highlights: pc.d4.highlights, quantifiedBullets: pc.d4.quantifiedBullets, totalBullets: pc.d4.totalBullets, actionVerbCount: pc.d4.actionVerbCount },
      education:    { score: Math.round(pc.d5.score), notes: pc.d5.notes },
      quantification: { score: Math.round(pc.d6.score), ratio: pc.d6.ratio },
    },
    suggestions: buildSuggestions(pc),
    focusAreas:  buildFocusAreas(pc, allDims),
  }));
}
