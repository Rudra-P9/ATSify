import type { ResumeSection, SectionType } from './types';

// maps common resume section headers to canonical types
const SECTION_PATTERNS: Record<SectionType, RegExp[]> = {
  contact: [/^(contact\s*(info(rmation)?)?|personal\s*(info(rmation)?|details))/i],
  summary: [/^(summary|professional\ssummary|profile|career\sobjective|objective)/i],
  experience: [/^(experience|work\sexperience|professional\sexperience|employment(\shistory)?|work\shistory|relevant\sexperience|career\shistory)/i],
  education: [/^(education|academic\sbackground|academic\shistory)/i],
  skills: [/^(skills|technical\sskills|core\scompetencies|competencies|areas?\sof\sexpertise|proficiencies|technologies|tools?\s*(&|and)\stechnologies)/i],
  projects: [/^(projects|personal\sprojects|academic\sprojects|key\sprojects)/i],
  certifications: [/^(certifications?|licenses?(\s(&|and)\scertifications?)?|professional\scertifications?|accreditations?)/i],
  awards: [/^(awards?|honors?|achievements?)/i],
  publications: [/^(publications?|research|papers?|presentations?)/i],
  volunteer: [/^(volunteer\swork|volunteering|community\sservice)/i],
  languages: [/^(languages?|language\s*proficiency)/i],
  interests: [/^(interests|hobbies|activities)/i],
  unknown: []
};

// checks if a line is a section header using pattern matching and heuristics
function isSectionHeader(line: string, prevLine: string | null, nextLine: string | null): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;

  // check against known patterns
  const cleaned = trimmed.replace(/[:\-_|]/g, '').trim();
  for (const patterns of Object.values(SECTION_PATTERNS)) {
    if (patterns.some((p) => p.test(cleaned))) return true;
  }

  // heuristic: all caps, short, and looks like a header
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const isShort = trimmed.split(/\s+/).length <= 4;
  const hasNoNumbers = !/\d/.test(trimmed); // avoid matching phone numbers, dates
  const prevIsBlank = prevLine === null || prevLine.trim().length === 0;

  // Additional header-like characteristic: starts with specific symbols or is underlined (handled by length/caps)
  // Avoid common job titles or companies that might be all-caps
  const headerBlocklist = /^(GOOGLE|META|APPLE|AMAZON|MICROSOFT|IBM|ORACLE|SAP|ADOBE|INTEL)$/i;
  
  if (isAllCaps && isShort && hasNoNumbers && prevIsBlank && !headerBlocklist.test(trimmed)) return true;

  // heuristic: title case, ends with colon
  if (trimmed.endsWith(':') && isShort) return true;

  // heuristic: line is visually separated and looks like a category label
  // must be preceded by blank line AND have content after it
  const isAlphaOnly = /^[a-zA-Z\s&,/]+$/.test(cleaned);
  const wordCount = cleaned.split(/\s+/).length;
  const nextIsContent = nextLine !== null && nextLine.trim().length > 0;
  // avoid matching personal names (typically 2-3 title-case words at document start)
  const isLikelyName = wordCount >= 2 && wordCount <= 3 && /^[A-Z][a-z]+ [A-Z]/.test(cleaned);

  if (isAlphaOnly && isShort && prevIsBlank && nextIsContent && !isLikelyName && cleaned.length > 2)
    return true;

  return false;
}

// classifies a section header string into a canonical SectionType
function classifySection(header: string): SectionType {
  const cleaned = header.replace(/[:\-_|]/g, '').trim();
  for (const [type, patterns] of Object.entries(SECTION_PATTERNS)) {
    if (patterns.some((p: RegExp) => p.test(cleaned))) {
      return type as SectionType;
    }
  }

  return 'unknown';
}

// detects and extracts sections from resume lines with type, header, content, and line ranges
export function detectSections(lines: string[]): ResumeSection[] {
  const sections: ResumeSection[] = [];
  const headerIndices: { index: number; header: string; type: SectionType }[] = [];

  // first pass: identify all section headers
  for (let i = 0; i < lines.length; i++) {
    const prevLine = i > 0 ? lines[i - 1] : null;
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

    if (isSectionHeader(lines[i], prevLine, nextLine)) {
      const type = classifySection(lines[i]);
      headerIndices.push({ index: i, header: lines[i].trim(), type });
    }
  }

  // if no headers detected, treat the entire text as a single unknown section
  if (headerIndices.length === 0) {
    return [
      {
        type: 'unknown',
        header: '',
        content: lines.join('\n'),
        startLine: 0,
        endLine: lines.length - 1
      }
    ];
  }

  // extract content between headers
  // content before first header is often contact info
  if (headerIndices[0].index > 0) {
    const contactContent = lines.slice(0, headerIndices[0].index).join('\n').trim();
    if (contactContent.length > 0) {
      sections.push({
        type: 'contact',
        header: '',
        content: contactContent,
        startLine: 0,
        endLine: headerIndices[0].index - 1
      });
    }
  }

  for (let i = 0; i < headerIndices.length; i++) {
    const current = headerIndices[i];
    const nextIndex = i < headerIndices.length - 1 ? headerIndices[i + 1].index : lines.length;

    const contentLines = lines.slice(current.index + 1, nextIndex);
    const content = contentLines.join('\n').trim();

    sections.push({
      type: current.type,
      header: current.header,
      content,
      startLine: current.index,
      endLine: nextIndex - 1
    });
  }

  return sections;
}