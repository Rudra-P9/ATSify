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

// ---------------------------------------------------------------------------
// Section content → structured entry extractors
// ---------------------------------------------------------------------------

/** Splits section content into entries using smarter heuristics */
function splitIntoEntries(content: string): string[] {
  const lines = content.split('\n');
  const entries: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      if (current.length > 0) {
        // Look ahead for strong indicators of a new entry header
        const nextLine = lines[i + 1]?.trim() || lines[i + 2]?.trim();
        if (nextLine) {
          const nextHasDate = extractDateRange(nextLine).start !== null;
          
          // Heuristic for position headers: Title-case words, short line, no punctuation at end
          const positionKeywords = /\b(engineer|developer|manager|lead|director|analyst|specialist|intern|associate|consultant|technician|coordinator|officer|architect|designer|representative|assistant|staff|student|founder|founder|owner|president|vp|executive)\b/i;
          const nextIsPosition = positionKeywords.test(nextLine) && nextLine.split(/\s+/).length < 8 && !nextLine.endsWith('.');
          const nextIsCompany = /(inc|llc|corp|ltd|co|group|solutions|systems|university|college|hospital|systems|tech|labs|technologies)$/i.test(nextLine);

          if (nextHasDate || nextIsPosition || nextIsCompany) {
            // Only split if current block has significant height or content
            // This prevents splitting a header from its first bullet if there was an empty line
            if (current.length >= 2 || current.some(l => l.length > 40)) {
              entries.push(current.join('\n'));
              current = [];
            }
          }
        }
      }
      continue;
    }

    // Heuristic: A line with a date range often starts a NEW entry
    // However, we only trigger this if we have a reasonably "full" block already (at least 3 lines)
    const hasDate = extractDateRange(trimmed).start !== null;
    const isBullet = /^[\s•\-*·▪►➤○●]/.test(line);

    if (hasDate && !isBullet && current.length >= 3) {
      entries.push(current.join('\n'));
      current = [];
    }

    current.push(line);
  }

  if (current.length > 0) {
    entries.push(current.join('\n'));
  }

  return entries.filter((e) => {
    const t = e.trim();
    // Filter out very short noise blocks
    return t.length > 35 && (extractDateRange(t).start !== null || t.split('\n').length >= 2);
  });
}

/** Parses job header for title and company. */
function parseJobHeader(line1: string, line2: string): { title: string; company: string } {
  // remove date patterns from lines for cleaner parsing
  const dateRegex = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}|present|current|now)/gi;
  const yearOnlyRegex = /\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)\b/gi;
  
  const cleanLine1 = line1.replace(dateRegex, '').replace(yearOnlyRegex, '').trim();
  const cleanLine2 = line2.replace(dateRegex, '').replace(yearOnlyRegex, '').trim();

  // try "Title | Company" or "Title - Company"
  const separatorMatch = cleanLine1.match(/^(.+?)\s*[|–—,]\s*(.+)$/);
  if (separatorMatch) {
    return { title: separatorMatch[1].trim(), company: separatorMatch[2].trim() };
  }

  // try "Title at Company"
  const atMatch = cleanLine1.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { title: atMatch[1].trim(), company: atMatch[2].trim() };
  }

  // two-line format: if line1 looks like a company (University, Inc, LLC)
  if (/(?:inc|llc|corp|ltd|co|university|college|hospital|systems|solutions|group)\.?$/i.test(cleanLine1)) {
    return { title: cleanLine2 || cleanLine1, company: cleanLine1 };
  }

  return { title: cleanLine1, company: cleanLine2 || '' };
}

/** Splits an experience section into individual position entries. */
function extractExperienceEntries(sections: ResumeSection[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  const expSections = sections.filter(s => s.type === 'experience');

  for (const section of expSections) {
    const blocks = splitIntoEntries(section.content);

    for (const block of blocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;

      const firstLine = lines[0];
      const secondLine = lines.length > 1 ? lines[1] : '';
      const headerText = firstLine + ' ' + secondLine;

      const dateRange = extractDateRange(headerText);
      const { title, company } = parseJobHeader(firstLine, secondLine);

      // Determine header line count: if title and company were both found on line 1, slice from 1.
      // Otherwise, if line 2 is not a bullet and not just a date, assume it's part of the header.
      const isLine1Complete = firstLine.includes('|') || firstLine.includes('–') || firstLine.includes('—') || firstLine.toLowerCase().includes(' at ');
      const isLine2Bullet = secondLine && /^[\s•\-*·▪►➤○●]/.test(secondLine);
      const headerLines = (isLine1Complete || isLine2Bullet || !secondLine) ? 1 : 2;

      const bullets = lines
        .slice(headerLines)
        .map((l) => l.replace(/^[\s•\-*·▪►➤○●]\s*/, '').trim())
        .filter((l) => l.length > 0);

      entries.push({
        title,
        company,
        dates: dateRange,
        bullets,
        rawText: block
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

/** Parses education header for degree, field, institution */
function parseEduHeader(lines: string[]): { degree: string; field: string; institution: string } {
  const degreePatterns = /\b(ph\.?d\.?|doctor|master'?s?|m\.?s\.?|m\.?a\.?|m\.?b\.?a\.?|bachelor'?s?|b\.?s\.?|b\.?a\.?|b\.?eng\.?|associate'?s?|a\.?s\.?|a\.?a\.?|diploma|undergraduate)\b/i;

  let degree = '';
  let field = '';
  let institution = '';

  for (const line of lines) {
    const cleaned = line.replace(/\d{4}\s*[-–—]\s*(?:\d{4}|present|current)/gi, '').trim();

    if (degreePatterns.test(cleaned) && !degree) {
      const match = cleaned.match(degreePatterns);
      if (match) {
        degree = match[0];
        // field often follows "in" or "of"
        const fieldMatch = cleaned.match(/(?:in|of)\s+(.+?)(?:\s*[-–—,|]|$)/i);
        if (fieldMatch) field = fieldMatch[1].trim();
        
        const instMatch = cleaned.replace(degreePatterns, '').replace(/(?:in|of)\s+.+/, '').trim();
        if (instMatch && !institution) institution = instMatch.replace(/^[-–—,|\s]+|[-–—,|\s]+$/g, '');
      }
    } else if (!institution && /(university|college|institute|school|academy)/i.test(cleaned)) {
      institution = cleaned.replace(/^[-–—,|\s]+|[-–—,|\s]+$/g, '');
    }
  }

  if (!degree && !institution) {
    institution = lines[0]?.trim() || '';
    if (lines.length > 1) degree = lines[1]?.trim() || '';
  }

  return { degree, field, institution };
}

/** Extracts education entries from education sections. */
function extractEducationEntries(sections: ResumeSection[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  const eduSections = sections.filter(s => s.type === 'education');

  for (const section of eduSections) {
    const blocks = splitIntoEntries(section.content);

    for (const block of blocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;

      const fullText = lines.join(' ');
      const dateRange = extractDateRange(fullText);
      const { degree, field, institution } = parseEduHeader(lines);
      
      const gpaMatch = fullText.match(/(?:gpa|g\.p\.a\.?)\s*:?\s*(\d\.\d{1,2})/i) || 
                       fullText.match(/(\d\.\d{1,2})\s*\/\s*(?:4|5)(?:\.0)?/i);
      const gpa = gpaMatch ? gpaMatch[1] : null;

      const honorsKeywords = /\b(cum laude|magna cum laude|summa cum laude|dean'?s?\s*list|honors?|distinction|scholarship|award)\b/i;
      const honors = lines.filter(l => honorsKeywords.test(l)).map(l => l.trim());

      if (degree || institution || field) {
        entries.push({
          degree,
          field,
          institution,
          dates: dateRange,
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

/**
 * Parses raw resume text directly (for the manual paste option).
 */
export function parseText(text: string): ParsedResume {
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

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)).length : 0;

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
      fileType: 'text',
      pageCount: Math.max(1, Math.ceil(wordCount / 450)),
      wordCount,
      lineCount: lines.length,
      hasMultipleColumns: false,
      hasTables: false,
      hasImages: false,
    }
  };
}

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

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)).length : 0;

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