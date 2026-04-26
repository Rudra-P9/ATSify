import { useState } from 'react';
import { AnalysisPipelineResult } from '../lib/pipeline/analyzeResume';

export function useAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisPipelineResult | null>(null);

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setError(null);
  };

  const endAnalysis = (res?: AnalysisPipelineResult, err?: string) => {
    setIsAnalyzing(false);
    if (res) setResult(res);
    if (err) setError(err);
  };

  return {
    isAnalyzing,
    error,
    result,
    startAnalysis,
    endAnalysis
  };
}
