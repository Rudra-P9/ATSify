/**
 * Deterministic rule-based ATS scoring engine.
 *
 * Produces consistent `AnalysisResponse` results without any external API calls.
 * Used as an automatic fallback when Gemini is unavailable.
 */

import type { AnalysisResponse } from '../gemini';
import { extractMetadata } from './metadata';
import { computeAllPlatforms } from './platforms';

export { extractMetadata } from './metadata';
export { computeAllPlatforms } from './platforms';

/**
 * Run the deterministic scoring engine and return a fully-formed
 * `AnalysisResponse` compatible with the UI schema.
 */
export function runDeterministicEngine(
  resumeText: string,
  jobDescription?: string,
): AnalysisResponse {
  const metadata = extractMetadata(resumeText);
  const results  = computeAllPlatforms(resumeText, metadata, jobDescription);

  return { results, metadata };
}
