import { Section, SectionType } from './types';

const SECTION_PATTERNS = {
  [SectionType.EXPERIENCE]: /^(?:Professional )?Experience|Work History|Employment/i,
  [SectionType.EDUCATION]: /^Education|Academic Background/i,
  [SectionType.SKILLS]: /^(?:Technical )?Skills|Core Competencies/i,
  [SectionType.PROJECTS]: /^(?:Personal )?Projects/i,
  [SectionType.SUMMARY]: /^(?:Professional )?Summary|Profile|Objective/i,
  [SectionType.CERTIFICATIONS]: /^Certifications|Licenses/i
};

export function detectSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      currentIndex += lines[i].length + 1;
      continue;
    }

    let detectedType = SectionType.UNKNOWN;

    // Very basic heuristic for detecting headers:
    // They are usually short, uppercase or Title Case
    if (line.length > 2 && line.length < 50) {
      for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
        if (pattern.test(line)) {
          detectedType = type as SectionType;
          break;
        }
      }
    }

    if (detectedType !== SectionType.UNKNOWN) {
      if (currentSection) {
        currentSection.endIndex = currentIndex;
        sections.push(currentSection);
      }
      currentSection = {
        title: line,
        type: detectedType,
        content: '',
        startIndex: currentIndex,
        endIndex: 0
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }

    currentIndex += lines[i].length + 1;
  }

  if (currentSection) {
    currentSection.endIndex = currentIndex;
    sections.push(currentSection);
  }

  return sections;
}
