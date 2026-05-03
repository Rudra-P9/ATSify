import { useMemo } from 'react';
import { AnalysisPipelineResult } from '../lib/pipeline/analyzeResume';

export function useScores(result: AnalysisPipelineResult | null) {
  const averageScore = useMemo(() => {
    if (!result || result.platformResults.length === 0) return 0;
    const sum = result.platformResults.reduce((acc, current) => acc + current.score.overallScore, 0);
    return Math.round(sum / result.platformResults.length);
  }, [result]);

  const systemsPassed = useMemo(() => {
    if (!result) return 0;
    return result.platformResults.filter(p => p.score.overallScore >= 70).length;
  }, [result]);

  const weakestPlatform = useMemo(() => {
    if (!result || result.platformResults.length === 0) return null;
    return result.platformResults.slice().sort((a, b) => a.score.overallScore - b.score.overallScore)[0];
  }, [result]);

  return {
    averageScore,
    systemsPassed,
    weakestPlatform
  };
}
