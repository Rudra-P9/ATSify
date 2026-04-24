export interface ParsedDocument {
  text: string;
  sections: Section[];
  metadata: DocumentMetadata;
}

export interface Section {
  title: string;
  type: SectionType;
  content: string;
  startIndex: number;
  endIndex: number;
}

export enum SectionType {
  CONTACT = 'CONTACT',
  SUMMARY = 'SUMMARY',
  EXPERIENCE = 'EXPERIENCE',
  EDUCATION = 'EDUCATION',
  SKILLS = 'SKILLS',
  PROJECTS = 'PROJECTS',
  CERTIFICATIONS = 'CERTIFICATIONS',
  UNKNOWN = 'UNKNOWN'
}

export interface DocumentMetadata {
  wordCount: number;
  pageCount: number;
  hasTables: boolean;
  hasColumns: boolean;
  hasGraphics: boolean;
  contactInfo: ContactInfo;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  location?: string;
  portfolio?: string;
}
