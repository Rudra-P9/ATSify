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

  // Extract name: heuristic looking at the first few lines
  let name: string | null = null;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Look at the first 10 lines for something that looks like a name
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    // A name is typically 2-4 words, mostly letters, doesn't contain contact info markers
    if (
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4 &&
      !/(resume|cv|curriculum vitae|email|phone|address|mobile|linkedin|github)/i.test(line) &&
      !emailRegex.test(line) &&
      !phoneRegex.test(line) &&
      !linkedinRegex.test(line)
    ) {
      // Clean up any trailing punctuation
      const cleanName = line.replace(/[,|:-].*$/, '').trim();
      // Check if it's mostly capitalized words (like a name should be)
      const words = cleanName.split(/\s+/);
      const isCapitalized = words.every(w => /^[A-Z]/.test(w));
      
      if (cleanName.length > 3 && isCapitalized) {
        name = cleanName;
        break;
      }
    }
  }

  return {
    name,
    email,
    phone,
    linkedin,
    github,
    website: null,
    location: null
  };
}