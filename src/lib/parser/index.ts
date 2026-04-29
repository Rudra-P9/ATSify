export * from './types';
export * from './pdf';
export * from './docx';
export * from './sectionDetector';
export * from './contactExtractor';
export * from './dateExtractor';

import { parsePDF } from './pdf';
import { parseDOCX } from './docx';
import { detectSections } from './sectionDetector';
import { extractContactInfo } from './contactExtractor';
import { extractKeywords } from '../nlp/keywordExtractor';
import type {
  ParsedResume,
  ResumeSection,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
  CertificationEntry,
  DateRange
} from './types';

// ---------------------------------------------------------------------------
// Section content → structured entry extractors
// ---------------------------------------------------------------------------

/** Splits an experience section into individual position entries. */
function extractExperienceEntries(sections: ResumeSection[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  const expSections = sections.filter(s => s.type === 'experience');

  for (const section of expSections) {
    const lines = section.content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Heuristic: split on lines containing date ranges to separate positions
    const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{2,4}|20\d{2}|19\d{2})\b.*(\u2013|–|-|to|\u2014)\s*.*(present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{2,4}|20\d{2}|19\d{2})/i;

    let currentEntry: { titleLine: string; bullets: string[]; rawLines: string[] } | null = null;
    const rawEntries: typeof currentEntry[] = [];

    for (const line of lines) {
      if (datePattern.test(line) || (!line.startsWith('-') && !line.startsWith('•') && !line.startsWith('*') && !line.startsWith('·') && line.length < 120 && /[A-Z]/.test(line[0]) && entries.length === 0 && !currentEntry)) {
        // This line likely starts a new position (has dates or looks like a title)
        if (currentEntry) rawEntries.push(currentEntry);
        currentEntry = { titleLine: line, bullets: [], rawLines: [line] };
      } else if (currentEntry) {
        currentEntry.rawLines.push(line);
        // Lines starting with bullet characters are bullet points
        if (/^[-•·▪◦▸►‣*]\s/.test(line) || /^\d+\.\s/.test(line)) {
          currentEntry.bullets.push(line.replace(/^[-•·▪◦▸►‣*]\s*/, '').replace(/^\d+\.\s*/, ''));
        }
      } else {
        // Content before first detected position — treat as a single entry
        currentEntry = { titleLine: line, bullets: [], rawLines: [line] };
      }
    }
    if (currentEntry) rawEntries.push(currentEntry);

    for (const raw of rawEntries) {
      if (!raw) continue;
      // Try to parse title and company from the title line
      // Common formats: "Title – Company" or "Title at Company" or "Company, Title"
      const titleLine = raw.titleLine;
      let title = titleLine;
      let company = '';
      const separatorMatch = titleLine.match(/^(.+?)(?:\s*[–\-—|,]\s*|\s+at\s+|\s+@\s+)(.+?)(?:\s*[,|]\s*.*)?$/i);
      if (separatorMatch) {
        title = separatorMatch[1].trim();
        company = separatorMatch[2].trim();
      }

      // Extract dates from the entry's raw text
      const entryText = raw.rawLines.join(' ');
      const dates = extractDateRange(entryText);

      entries.push({
        title,
        company,
        dates,
        bullets: raw.bullets,
        rawText: raw.rawLines.join('\n')
      });
    }
  }

  return entries;
}

/** Extracts a date range from text. */
function extractDateRange(text: string): DateRange {
  const dateRangeMatch = text.match(
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{2,4}|(?:19|20)\d{2})\s*(?:\u2013|–|-|to|\u2014)\s*(present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{2,4}|(?:19|20)\d{2})/i
  );

  return {
    start: dateRangeMatch ? dateRangeMatch[1] : null,
    end: dateRangeMatch ? dateRangeMatch[2] : null,
    isCurrent: dateRangeMatch ? /present|current/i.test(dateRangeMatch[2]) : false
  };
}

/** Extracts education entries from education sections. */
function extractEducationEntries(sections: ResumeSection[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  const eduSections = sections.filter(s => s.type === 'education');

  const DEGREE_PATTERNS = [
    { label: 'PhD', regex: /\b(ph\.?d|doctor(?:ate)?)\b/i },
    { label: "Master's", regex: /\b(m\.?s\.?|m\.?a\.?|master(?:'?s)?|mba|m\.?eng|msc)\b/i },
    { label: "Bachelor's", regex: /\b(b\.?s\.?|b\.?a\.?|bachelor(?:'?s)?|b\.?eng|bsc|b\.?tech|btech)\b/i },
    { label: "Associate's", regex: /\b(associate(?:'?s)?|a\.?s\.?|a\.?a\.?)\b/i },
  ];

  const FIELD_PATTERNS = /(?:computer science|engineering|business|mathematics|biology|chemistry|physics|psychology|economics|finance|accounting|marketing|nursing|law|education|design|communications|information technology|data science|information systems|software engineering|electrical engineering|mechanical engineering|civil engineering)/i;

  for (const section of eduSections) {
    const content = section.content;
    // Split by blank lines or degree patterns to separate entries
    const blocks = content.split(/\n\s*\n/).filter(b => b.trim().length > 0);

    for (const block of blocks) {
      let degree = '';
      let field = '';
      let institution = '';
      let gpa: string | null = null;
      const honors: string[] = [];

      // Detect degree
      for (const { label, regex } of DEGREE_PATTERNS) {
        if (regex.test(block)) {
          degree = label;
          break;
        }
      }

      // Detect field of study
      const fieldMatch = block.match(FIELD_PATTERNS);
      if (fieldMatch) field = fieldMatch[0];

      // Detect institution (line with "University", "College", "Institute", "School")
      const instMatch = block.match(/(.+(?:university|college|institute|school|academy).+)/i);
      if (instMatch) institution = instMatch[1].trim();

      // Detect GPA
      const gpaMatch = block.match(/(?:gpa|g\.p\.a\.?)\s*:?\s*(\d\.\d{1,2})/i) || block.match(/(\d\.\d{1,2})\s*\/\s*4/i);
      if (gpaMatch) gpa = gpaMatch[1];

      // Detect honors
      const honorsMatch = block.match(/\b(cum laude|magna cum laude|summa cum laude|dean'?s?\s*list|honors?|distinction|with\s+(?:highest\s+)?honors?)\b/i);
      if (honorsMatch) honors.push(honorsMatch[0]);

      // Dates
      const dates = extractDateRange(block);

      if (degree || institution || field) {
        entries.push({
          degree,
          field,
          institution,
          dates,
          gpa,
          honors,
          rawText: block.trim()
        });
      }
    }
  }

  return entries;
}

/** Extracts project entries from project sections. */
function extractProjectEntries(sections: ResumeSection[]): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  const projSections = sections.filter(s => s.type === 'projects');

  for (const section of projSections) {
    const blocks = section.content.split(/\n\s*\n/).filter(b => b.trim().length > 0);

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      const name = lines[0].replace(/^[-•·▪*]\s*/, '');
      const bullets = lines.slice(1)
        .filter(l => /^[-•·▪◦▸►‣*]\s/.test(l))
        .map(l => l.replace(/^[-•·▪◦▸►‣*]\s*/, ''));
      const description = lines.slice(1).filter(l => !/^[-•·▪◦▸►‣*]\s/.test(l)).join(' ');
      const urlMatch = block.match(/https?:\/\/[^\s)]+/);

      entries.push({
        name,
        description,
        technologies: extractKeywords(block),
        bullets,
        url: urlMatch ? urlMatch[0] : null,
        rawText: block.trim()
      });
    }
  }

  return entries;
}

/** Extracts certification entries from certification sections. */
function extractCertificationEntries(sections: ResumeSection[]): CertificationEntry[] {
  const entries: CertificationEntry[] = [];
  const certSections = sections.filter(s => s.type === 'certifications');

  for (const section of certSections) {
    const lines = section.content.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const clean = line.replace(/^[-•·▪◦▸►‣*]\s*/, '');
      if (clean.length < 3) continue;

      // Try to extract issuer from patterns like "Name – Issuer" or "Name (Issuer)"
      let name = clean;
      let issuer = '';
      const issuerMatch = clean.match(/^(.+?)(?:\s*[–\-—]\s*|\s*\|\s*)(.+)$/);
      if (issuerMatch) {
        name = issuerMatch[1].trim();
        issuer = issuerMatch[2].trim();
      }
      const parenMatch = clean.match(/^(.+?)\s*\((.+?)\)\s*$/);
      if (parenMatch && !issuerMatch) {
        name = parenMatch[1].trim();
        // Could be date or issuer in parens
        if (/\d{4}/.test(parenMatch[2])) {
          // It's a date
        } else {
          issuer = parenMatch[2].trim();
        }
      }

      const yearMatch = clean.match(/\b(20\d{2}|19\d{2})\b/);

      entries.push({
        name,
        issuer,
        date: yearMatch ? yearMatch[1] : null,
        rawText: clean
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main parser entry point
// ---------------------------------------------------------------------------

export async function parseDocument(file: File): Promise<ParsedResume> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  let text = '';
  let metadataExtras: any = {};

  if (extension === 'pdf') {
    const result = await parsePDF(file);
    text = result.text;
    metadataExtras = {
      pageCount: result.pageCount,
      hasTables: result.hasTables,
      hasColumns: result.hasMultipleColumns,
      hasGraphics: result.hasImages
    };
  } else if (extension === 'docx') {
    const result = await parseDOCX(file);
    text = result.text;
    metadataExtras = {
      pageCount: Math.max(1, Math.ceil(text.split(/\s+/).length / 450)),
      hasTables: result.hasTables,
      hasGraphics: result.hasImages
    };
  } else if (extension === 'txt' || extension === 'text') {
    text = await file.text();
    metadataExtras = {
      pageCount: 1,
      hasTables: false,
      hasGraphics: false
    };
  } else {
    throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
  }

  const lines = text.split('\n');
  const sections = detectSections(lines);
  const contact = extractContactInfo(text);

  // Extract structured data from detected sections
  const experience = extractExperienceEntries(sections);
  const education = extractEducationEntries(sections);
  const projects = extractProjectEntries(sections);
  const certifications = extractCertificationEntries(sections);
  const skills = extractKeywords(text);
  const summarySection = sections.find(s => s.type === 'summary');
  const summary = summarySection ? summarySection.content : null;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return {
    rawText: text,
    lines,
    contact,
    sections,
    experience,
    education,
    projects,
    certifications,
    skills,
    summary,
    metadata: {
      fileType: (extension === 'pdf' ? 'pdf' : extension === 'docx' ? 'docx' : 'text') as any,
      pageCount: metadataExtras.pageCount || 1,
      wordCount,
      lineCount: lines.length,
      hasMultipleColumns: metadataExtras.hasColumns || false,
      hasTables: metadataExtras.hasTables || false,
      hasImages: metadataExtras.hasGraphics || false,
    }
  };
}