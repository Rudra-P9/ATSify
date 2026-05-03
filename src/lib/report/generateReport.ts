import { ScoreResult } from '../scorer/types';

export interface Report {
  summary: string;
  criticalIssues: string[];
  optimizations: string[];
  strengths: string[];
}

export function generateReport(result: ScoreResult): Report {
  const criticalIssues: string[] = [];
  const optimizations: string[] = [];
  const strengths: string[] = [];

  // Categorize suggestions
  result.suggestions.forEach(suggestion => {
    const s = suggestion.toLowerCase();
    if (s.includes('missing') || s.includes('remove') || s.includes('switch to')) {
      criticalIssues.push(suggestion);
    } else {
      optimizations.push(suggestion);
    }
  });

  // Identify strengths
  if (result.breakdown.formatting.score >= 90) strengths.push('Excellent document structure and formatting');
  if (result.breakdown.experience.score >= 80) strengths.push('Strong use of action verbs and measurable achievements');
  if (result.breakdown.keywordMatch.score >= 70) strengths.push('Good keyword alignment with the target role');

  const summary = result.overallScore >= 80 
    ? `Your resume is highly optimized for ${result.system}. It shows strong alignment with core requirements.`
    : result.overallScore >= 60
    ? `Your resume is a solid match for ${result.system}, but some critical optimizations could significantly boost your ranking.`
    : `Your resume faces some parsing challenges on ${result.system}. Immediate changes to formatting or keywords are recommended.`;

  return {
    summary,
    criticalIssues,
    optimizations,
    strengths
  };
}
