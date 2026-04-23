import type { ResumeMetadata } from '../gemini';

// ---------------------------------------------------------------------------
// Known section heading patterns (name → list of recognised header strings)
// ---------------------------------------------------------------------------
const SECTION_PATTERNS: Array<{ name: string; patterns: string[] }> = [
  { name: 'contact',         patterns: ['contact', 'contact information', 'personal information', 'personal details', 'contact details'] },
  { name: 'summary',         patterns: ['summary', 'professional summary', 'profile', 'objective', 'career objective', 'about me', 'overview'] },
  { name: 'experience',      patterns: ['experience', 'work experience', 'professional experience', 'employment', 'work history', 'career history', 'employment history'] },
  { name: 'education',       patterns: ['education', 'academic background', 'academic history', 'qualifications', 'academic qualifications'] },
  { name: 'skills',          patterns: ['skills', 'technical skills', 'core competencies', 'competencies', 'expertise', 'technologies', 'tools'] },
  { name: 'certifications',  patterns: ['certifications', 'certificates', 'credentials', 'licenses', 'certification'] },
  { name: 'projects',        patterns: ['projects', 'personal projects', 'key projects', 'project experience', 'portfolio'] },
  { name: 'awards',          patterns: ['awards', 'achievements', 'honors', 'accomplishments', 'recognitions'] },
  { name: 'publications',    patterns: ['publications', 'papers', 'research', 'articles'] },
  { name: 'volunteer',       patterns: ['volunteer', 'volunteering', 'community service', 'community involvement'] },
  { name: 'languages',       patterns: ['languages', 'spoken languages'] },
  { name: 'references',      patterns: ['references', 'referees'] },
];

// Common technical + professional skills used for heuristic extraction
const COMMON_SKILLS: string[] = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt',
  'node.js', 'express', 'fastapi', 'django', 'flask', 'spring', 'rails', 'laravel',
  'html', 'css', 'scss', 'tailwind', 'bootstrap',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'sqlite', 'oracle', 'firebase',
  'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify',
  'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci',
  'git', 'linux', 'bash', 'powershell',
  'rest', 'graphql', 'grpc', 'websocket',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
  'data analysis', 'tableau', 'power bi', 'excel', 'r',
  'agile', 'scrum', 'kanban', 'jira', 'confluence',
  'ci/cd', 'devops', 'microservices', 'serverless',
  'project management', 'product management', 'leadership', 'communication', 'teamwork',
  'problem solving', 'critical thinking', 'data engineering', 'cloud computing',
];

const DEGREE_PATTERNS: Array<{ label: string; patterns: RegExp }> = [
  { label: 'PhD / Doctorate', patterns: /\b(phd|ph\.d|doctor(ate)?)\b/i },
  { label: 'Master\'s',       patterns: /\b(m\.s|ms|m\.a|ma|master|mba|m\.eng|msc)\b/i },
  { label: 'Bachelor\'s',     patterns: /\b(b\.s|bs|b\.a|ba|bachelor|b\.eng|bsc|b\.tech|btech)\b/i },
  { label: 'Associate\'s',    patterns: /\b(associate|a\.s|a\.a)\b/i },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function extractMetadata(resumeText: string): ResumeMetadata {
  const lower = resumeText.toLowerCase();
  const lines = resumeText.split('\n');

  const wordCount = resumeText.split(/\s+/).filter(w => w.length > 0).length;
  const sections = detectSections(lower);
  const skills = extractSkills(lower);
  const positions = countPositions(resumeText);
  const education = extractEducation(resumeText);
  const contactInfo = extractContactInfo(resumeText);
  const checkmarks = {
    multiColumn: detectMultiColumn(lines),
    tables:      detectTables(lines),
    images:      detectImages(lower),
  };

  return { wordCount, sections, skills, positions, education, contactInfo, checkmarks };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function detectSections(lower: string): string[] {
  const detected: string[] = [];
  for (const { name, patterns } of SECTION_PATTERNS) {
    const found = patterns.some(p => {
      // Try to match as a standalone heading (whole line or followed by newline/colon)
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|\\n)\\s*${escaped}\\s*(?::|\\n|$)`, 'i').test(lower);
    });
    if (found && !detected.includes(name)) {
      detected.push(name);
    }
  }
  return detected;
}

function extractSkills(lower: string): string[] {
  return COMMON_SKILLS.filter(s => lower.includes(s));
}

function countPositions(text: string): number {
  // Match date range patterns indicating job positions
  const patterns: RegExp[] = [
    /\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}\b/g,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(19|20)\d{2}\s*[-–—]/gi,
    /\b(19|20)\d{2}\s*[-–—]\s*present\b/gi,
    /\b(19|20)\d{2}\s*[-–—]\s*current\b/gi,
  ];
  const seen = new Set<string>();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      seen.add(m[0].toLowerCase().replace(/\s+/g, ' ').trim());
    }
  }
  return seen.size;
}

function extractEducation(text: string): string[] {
  const results: string[] = [];
  const lines = text.split('\n');
  for (const { patterns: re } of DEGREE_PATTERNS) {
    for (const line of lines) {
      if (re.test(line)) {
        const trimmed = line.trim();
        if (trimmed && !results.includes(trimmed)) {
          results.push(trimmed);
        }
        break; // one match per degree type
      }
    }
  }
  return results;
}

function extractContactInfo(text: string): ResumeMetadata['contactInfo'] {
  const emailMatch   = text.match(/\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/);
  const phoneMatch   = text.match(/(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/);
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i);
  // City, ST pattern or City, Country
  const locationMatch = text.match(/\b([A-Z][a-zA-Z\s]{1,20},\s*(?:[A-Z]{2}|[A-Z][a-zA-Z\s]{2,15}))\b/);

  return {
    email:    emailMatch?.[0],
    phone:    phoneMatch?.[0],
    linkedin: linkedinMatch?.[0],
    location: locationMatch?.[0],
  };
}

/**
 * Multi-column heuristic: look for several non-trivial lines that have a
 * large internal whitespace gap suggesting side-by-side content.
 */
function detectMultiColumn(lines: string[]): boolean {
  let hits = 0;
  for (const line of lines) {
    if (line.length > 40 && /\S[ \t]{6,}\S/.test(line)) {
      hits++;
    }
  }
  return hits > 4;
}

/** Table heuristic: 3+ lines containing a pipe character. */
function detectTables(lines: string[]): boolean {
  return lines.filter(l => l.includes('|')).length >= 3;
}

/** Image heuristic: explicit placeholder text. */
function detectImages(lower: string): boolean {
  return /\[image\]|\[photo\]|\[logo\]|\[figure\]/.test(lower);
}
