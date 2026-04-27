import { parseDocument } from '../parser/index';
import { executeScoringEngine } from '../scorer/engine';
import { generateReport } from '../report/generateReport';
import { PLATFORMS, ATSProfile } from '../platforms';

export interface AnalysisPipelineResult {
  metadata: any;
  platformResults: Array<{
    platform: ATSProfile;
    score: any;
    report: any;
  }>;
}

export async function processResumePipeline(file: File, jobDescription?: string): Promise<AnalysisPipelineResult> {
  // 1. Parsing Layer
  const parsedDoc = await parseDocument(file);

  // 2-4. Orchestrate across platforms
  const platformResults = PLATFORMS.map(platform => {
    // 2. Score Layer (injecting specific weights per logic)
    const scoreResult = executeScoringEngine(parsedDoc, jobDescription, platform);

    // If platform requires exact keywords and we missed many, heavily penalize overall score
    if (platform.keywordStrategy === 'exact' && scoreResult.breakdown.keywordMatch.score < 50) {
      scoreResult.overallScore = Math.max(0, scoreResult.overallScore - 15);
    }
    // If strict formatting and issues found
    if (platform.parsingStrictness > 0.7 && scoreResult.breakdown.formatting.issues.length > 0) {
      scoreResult.overallScore = Math.max(0, scoreResult.overallScore - 20);
    }

    // 4. Report Engine
    const report = generateReport(scoreResult);

    return {
      platform,
      score: scoreResult,
      report
    };
  });

  return {
    metadata: parsedDoc.metadata,
    platformResults
  };
}
