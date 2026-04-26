import { processResumePipeline, AnalysisPipelineResult } from '../lib/pipeline/analyzeResume';

// This acts as a Proxy wrapper so if you decide to deploy an Express
// or Next.js backend, you simply move this logic into the server route.
export async function analyzeResumeAPI(file: File, jobDescription?: string): Promise<AnalysisPipelineResult> {
  try {
    // In a real backend, 'file' would be parsed from multipart/form-data
    const results = await processResumePipeline(file, jobDescription);
    return results;
  } catch (error: any) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}
