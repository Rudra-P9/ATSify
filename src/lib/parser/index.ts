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
import { ParsedResume } from './types';

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
      pageCount: 1,
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

  return {
    rawText: text,
    lines,
    contact,
    sections,
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    skills: [],
    summary: null,
    metadata: {
      fileType: (extension === 'pdf' ? 'pdf' : extension === 'docx' ? 'docx' : 'text') as any,
      pageCount: metadataExtras.pageCount || 1,
      wordCount: (function () {
        const trimmedText = text.trim();
        return trimmedText ? trimmedText.split(/\s+/).length : 0;
      })(),
      lineCount: lines.length,
      hasMultipleColumns: metadataExtras.hasColumns || false,
      hasTables: metadataExtras.hasTables || false,
      hasImages: metadataExtras.hasGraphics || false,
    }
  };
}