import { describe, it, expect } from 'vitest';
import { extractKeywords } from '../src/lib/nlp/keywordExtractor';

describe('Keyword Extractor', () => {
  it('should extract target skills defined in the taxonomy', () => {
    const keywords = extractKeywords("I am a software engineer with over 5 years of React and Python experience.");
    expect(keywords).toContain('react');
    expect(keywords).toContain('python');
  });

  it('should identify arbitrary capitalized keywords', () => {
    const keywords = extractKeywords("Experience heavily analyzing metrics in SEO and SEM workflows.");
    expect(keywords).toContain('SEO');
    expect(keywords).toContain('SEM');
  });
});
