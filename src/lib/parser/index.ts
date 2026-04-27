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
import { ParsedDocument } from './types';

export async function parseDocument(file: File): Promise<ParsedDocument> {
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
  } else {
    throw new Error('Unsupported file format. Please upload PDF or DOCX.');
  }

  const sections = detectSections(text);
  const contactInfo = extractContactInfo(text);

  return {
    text,
    sections,
    metadata: {
      wordCount: (function () {
        const trimmedText = text.trim();
        return trimmedText ? trimmedText.split(/\s+/).length : 0;
      })(),
      pageCount: metadataExtras.pageCount || 1,
      hasTables: metadataExtras.hasTables || false,
      hasColumns: metadataExtras.hasColumns || false,
      hasGraphics: metadataExtras.hasGraphics || false,
      contactInfo
    }
  };
}