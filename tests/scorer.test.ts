import { describe, it, expect } from 'vitest';
import { scoreExperience } from '../src/lib/scorer/experienceScorer';
import { ParsedDocument, SectionType } from '../src/lib/parser/index';

describe('Experience Scorer', () => {
  it('should penalize unquantified bullets', () => {
    const doc: ParsedDocument = {
      text: '',
      metadata: {} as any,
      sections: [{
        title: 'Experience',
        type: SectionType.EXPERIENCE,
        content: '- Worked on the backend\n- Did some API changes',
        startIndex: 0,
        endIndex: 0
      }]
    };

    const res = scoreExperience(doc);
    expect(res.quantifiedBullets).toBe(0);
    expect(res.score).toBeLessThan(70);
  });
});
