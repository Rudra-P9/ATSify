import { describe, it, expect } from 'vitest';
import { scoreExperience } from '../src/lib/scorer/experienceScorer';
import { ParsedDocument } from '../src/lib/parser';

describe('Experience Scorer', () => {
  it('should penalize unquantified bullets', () => {
    const doc: ParsedDocument = {
      rawText: '',
      lines: [],
      contact: {} as any,
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      skills: [],
      summary: null,
      metadata: {} as any,
      sections: [{
        header: 'Experience',
        type: 'experience',
        content: '- Worked on the backend\n- Did some API changes',
        startLine: 0,
        endLine: 0
      }]
    };

    const res = scoreExperience(doc);
    expect(res.quantifiedBullets).toBe(0);
    expect(res.score).toBeLessThan(70);
  });
});