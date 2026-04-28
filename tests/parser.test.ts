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

    const sections = detectSections(doc.split('\n'));
    expect(sections.find(s => s.type === 'summary')).toBeDefined();
    expect(sections.find(s => s.type === 'experience')).toBeDefined();
    expect(sections.find(s => s.type === 'education')).toBeDefined();
  });
});
