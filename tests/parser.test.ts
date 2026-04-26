import { describe, it, expect } from 'vitest';
import { detectSections } from '../src/lib/parser/sectionDetector';

describe('Section Detector', () => {
  it('should detect Experience bounds correctly', () => {
    const doc = `
Professional Summary
I am a great dev.

Experience
Software Engineer at Google
- Did stuff

Education
BS at MIT
    `;

    const sections = detectSections(doc);
    expect(sections.find(s => s.type === 'SUMMARY')).toBeDefined();
    expect(sections.find(s => s.type === 'EXPERIENCE')).toBeDefined();
    expect(sections.find(s => s.type === 'EDUCATION')).toBeDefined();
  });
});
