import { ATSReport, Insight } from './types';
import { ScorerResult } from '../scorer';

export function generateReport(result: ScorerResult): ATSReport {
  const insights: Insight[] = [];
  
  if (result.breakdown.formatting.issues.length > 0) {
    insights.push({
      category: 'Formatting',
      message: `Critical parsing risk: ${result.breakdown.formatting.issues.join(', ')}`,
      priority: 'HIGH',
      deltaPotential: 15
    });
  }

  if (result.breakdown.keywordMatch.score < 60) {
    insights.push({
      category: 'Keywords',
      message: `Weak keyword density. Missing critical targets: ${result.breakdown.keywordMatch.missing.slice(0, 3).join(', ')}`,
      priority: 'HIGH',
      deltaPotential: 20
    });
  }

  if (result.breakdown.experience.quantifiedBullets < 3) {
    insights.push({
      category: 'Impact',
      message: `Add more metrics ($, %, counts) to your experience. Detected only ${result.breakdown.experience.quantifiedBullets} quantified points.`,
      priority: 'MEDIUM',
      deltaPotential: 10
    });
  }

  if (result.breakdown.sections.score < 100) {
     insights.push({
      category: 'Structure',
      message: `Missing standard sections: ${result.breakdown.sections.missing.join(', ')}.`,
      priority: 'HIGH',
      deltaPotential: 15
     });
  }

  const summary = result.overallScore >= 80 
    ? "Your resume is highly optimized for this platform."
    : result.overallScore >= 60
    ? "Your resume meets standard requirements but risks being filtered without specific revisions."
    : "Your resume represents a high risk of auto-rejection by this platform.";

  return {
    score: result.overallScore,
    insights,
    summary
  };
}
