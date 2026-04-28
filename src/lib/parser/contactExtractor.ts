import { ContactInfo } from './types';

export function extractContactInfo(text: string): ContactInfo {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
  const linkedinRegex = /linkedin\.com\/in\/[A-Za-z0-9_-]+/;
  const githubRegex = /github\.com\/[A-Za-z0-9_-]+/;

  const email = text.match(emailRegex)?.[0] || null;
  const phoneMatch = text.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;
  const linkedin = text.match(linkedinRegex)?.[0] || null;
  const github = text.match(githubRegex)?.[0] || null;

  return {
    name: null,
    email,
    phone,
    linkedin,
    github,
    website: null,
    location: null
  };
}