import { parseDocument } from '../parser/index';
import { scoreResume } from '../scorer/engine';
import { generateReport } from '../report/generateReport';
import { PLATFORMS, ATSProfile } from '../platforms';
import { ScoringInput } from '../scorer/types';

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

  const scoringInput: ScoringInput = {
    hasMultipleColumns: parsedDoc.metadata.hasMultipleColumns,
    hasTables: parsedDoc.metadata.hasTables,
    hasImages: parsedDoc.metadata.hasImages,
    pageCount: parsedDoc.metadata.pageCount,
    wordCount: parsedDoc.metadata.wordCount,
    resumeText: parsedDoc.rawText,
    resumeSections: parsedDoc.sections.map((s) => s.type.toLowerCase()),
    experienceBullets: parsedDoc.sections
      .filter((s) => s.type === 'experience')
      .map((s) => s.content.split('\n'))
      .flat(),
    educationText: parsedDoc.sections.find(s => s.type === 'education')?.content || '',
    jobDescription: jobDescription,
    resumeSkills: parsedDoc.sections
      .filter((s) => s.type === 'skills')
      .map((s) => s.content.split('\n'))
      .flat()
  };

  // 2. Orchestrate across platforms using the new template engine
  const scoreResults = scoreResume(scoringInput);

  const platformResults = PLATFORMS.map((platform, idx) => {
    const scoreResult = scoreResults[idx];

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
