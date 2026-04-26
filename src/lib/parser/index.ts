export * from './types';
export * from './pdf';
export * from './docx';
export * from './sectionDetector';
export * from './contactExtractor';
export * from './dateExtractor';

import { extractPdfText } from './pdf';
import { extractDocxText } from './docx';
import { detectSections } from './sectionDetector';
import { extractContactInfo } from './contactExtractor';
import { ParsedDocument } from './types';

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  let text = '';
  if (extension === 'pdf') {
    text = await extractPdfText(file);
  } else if (extension === 'docx') {
    text = await extractDocxText(file);
  } else {
    throw new Error('Unsupported file format. Please upload PDF or DOCX.');
  }

  const sections = detectSections(text);
  const contactInfo = extractContactInfo(text);

  return {
    text,
    sections,
    metadata: {
      wordCount: (function() {
        const trimmedText = text.trim();
        return trimmedText ? trimmedText.split(/\s+/).length : 0;
      })(),
      pageCount: 1, // rough estimate or replace with actual pdf page parsing
      hasTables: false,
      hasColumns: false,
      hasGraphics: false,
      contactInfo
    }
  };
}
