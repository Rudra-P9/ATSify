import { describe, it, expect } from 'vitest';
import { runDeterministicEngine } from '../index';
import { scoreKeywordMatch } from '../dimensions';
import { extractMetadata } from '../metadata';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_RESUME = `
John Doe
john.doe@example.com | (555) 123-4567 | linkedin.com/in/johndoe | San Francisco, CA

SUMMARY
Results-driven software engineer with 5+ years of experience building scalable web applications.

EXPERIENCE
Senior Software Engineer – Acme Corp, San Francisco, CA
Jan 2021 – Present
• Developed and launched a new React-based dashboard that improved user engagement by 35%
• Led a team of 5 engineers to migrate monolithic application to microservices architecture
• Reduced infrastructure costs by $120,000 annually through AWS optimization
• Implemented CI/CD pipelines using GitHub Actions, cutting deployment time by 60%

Software Engineer – Beta Inc, New York, NY
Jun 2018 – Dec 2020
• Built REST API endpoints using Node.js and Express serving 2 million requests daily
• Optimized PostgreSQL queries, reducing average response time by 40%
• Collaborated with cross-functional teams of designers and product managers
• Shipped 15+ features using agile/scrum methodology

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley – May 2018

SKILLS
JavaScript, TypeScript, React, Node.js, Python, SQL, PostgreSQL, MongoDB, AWS, Docker,
Git, CI/CD, REST, GraphQL, Agile, Scrum

CERTIFICATIONS
AWS Certified Solutions Architect – Associate (2022)

PROJECTS
Open Source Contribution: Contributed 12 pull requests to popular React component library
Personal Portfolio: Built responsive portfolio site using Next.js and Tailwind CSS
`;

const SAMPLE_JD = `
We are looking for a Senior Software Engineer to join our team.
Requirements:
- 3+ years of experience with JavaScript and TypeScript
- Strong knowledge of React and Node.js
- Experience with AWS or other cloud platforms
- Familiarity with CI/CD pipelines and Docker
- Bachelor's degree in Computer Science or related field
- Experience with REST API design and microservices
- Proficiency in SQL and database design
`;

const MINIMAL_RESUME = `
Jane Smith
jane@example.com

EXPERIENCE
Software Developer at XYZ Corp 2020-2022

EDUCATION
BS Computer Science
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runDeterministicEngine', () => {
  it('returns exactly 6 results', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    expect(response.results).toHaveLength(6);
  });

  it('returns results with expected platform names', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    const names = response.results.map(r => r.system);
    expect(names).toContain('Workday');
    expect(names).toContain('Taleo');
    expect(names).toContain('iCIMS');
    expect(names).toContain('Greenhouse');
    expect(names).toContain('Lever');
    expect(names).toContain('SuccessFactors');
  });

  it('all overallScores are within [0, 100]', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    for (const result of response.results) {
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it('all breakdown dimension scores are within [0, 100]', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    for (const result of response.results) {
      const bd = result.breakdown;
      expect(bd.formatting.score).toBeGreaterThanOrEqual(0);
      expect(bd.formatting.score).toBeLessThanOrEqual(100);
      expect(bd.keywordMatch.score).toBeGreaterThanOrEqual(0);
      expect(bd.keywordMatch.score).toBeLessThanOrEqual(100);
      expect(bd.sections.score).toBeGreaterThanOrEqual(0);
      expect(bd.sections.score).toBeLessThanOrEqual(100);
      expect(bd.experience.score).toBeGreaterThanOrEqual(0);
      expect(bd.experience.score).toBeLessThanOrEqual(100);
      expect(bd.education.score).toBeGreaterThanOrEqual(0);
      expect(bd.education.score).toBeLessThanOrEqual(100);
      expect(bd.quantification.score).toBeGreaterThanOrEqual(0);
      expect(bd.quantification.score).toBeLessThanOrEqual(100);
    }
  });

  it('passesFilter is true iff overallScore >= platform passing threshold', () => {
    const PASSING: Record<string, number> = {
      Workday: 70,
      Taleo: 75,
      iCIMS: 60,
      Greenhouse: 50,
      Lever: 50,
      SuccessFactors: 65,
    };
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    for (const result of response.results) {
      const threshold = PASSING[result.system];
      expect(result.passesFilter).toBe(result.overallScore >= threshold);
    }
  });

  it('results are deterministic (same input → same output)', () => {
    const r1 = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    const r2 = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('works without a job description', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME);
    expect(response.results).toHaveLength(6);
    for (const result of response.results) {
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    }
  });

  it('works with minimal resume text', () => {
    const response = runDeterministicEngine(MINIMAL_RESUME);
    expect(response.results).toHaveLength(6);
  });

  it('includes metadata with required fields', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    const meta = response.metadata;
    expect(typeof meta.wordCount).toBe('number');
    expect(meta.wordCount).toBeGreaterThan(0);
    expect(Array.isArray(meta.sections)).toBe(true);
    expect(Array.isArray(meta.skills)).toBe(true);
    expect(typeof meta.positions).toBe('number');
    expect(Array.isArray(meta.education)).toBe(true);
    expect(typeof meta.checkmarks.multiColumn).toBe('boolean');
    expect(typeof meta.checkmarks.tables).toBe('boolean');
    expect(typeof meta.checkmarks.images).toBe('boolean');
  });

  it('each result has suggestions and focusAreas arrays', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    for (const result of response.results) {
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.focusAreas)).toBe(true);
      expect(result.focusAreas).toHaveLength(6);
    }
  });

  it('focusArea scores are within [0, 100]', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    for (const result of response.results) {
      for (const fa of result.focusAreas) {
        expect(fa.score).toBeGreaterThanOrEqual(0);
        expect(fa.score).toBeLessThanOrEqual(100);
        expect(fa.platformAvg).toBeGreaterThanOrEqual(0);
        expect(fa.platformAvg).toBeLessThanOrEqual(100);
      }
    }
  });

  it('suggestion priorities are HIGH, MEDIUM, or LOW', () => {
    const response = runDeterministicEngine(SAMPLE_RESUME, SAMPLE_JD);
    for (const result of response.results) {
      for (const sug of result.suggestions) {
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(sug.priority);
      }
    }
  });
});

describe('Keyword matching strategies', () => {
  const resumeWithJs = 'I have experience with JavaScript and React and Node.js development.';
  const jdRequiringJs = 'Requirements: JavaScript, React, Node.js, TypeScript, Docker experience needed.';

  it('exact strategy does NOT populate synonyms array', () => {
    const meta = extractMetadata(resumeWithJs);
    const result = scoreKeywordMatch(resumeWithJs, meta, jdRequiringJs, 'exact');
    expect(result.synonyms).toHaveLength(0);
  });

  it('fuzzy strategy may populate synonyms array', () => {
    const resumeWithAlias = 'Proficient in JS, ReactJS, and ts development for enterprise apps.';
    const meta = extractMetadata(resumeWithAlias);
    // "js" is a synonym for "javascript", "reactjs" for "react", "ts" for "typescript"
    const result = scoreKeywordMatch(resumeWithAlias, meta, jdRequiringJs, 'fuzzy');
    // synonyms list should be non-empty because aliases are present but exact terms may differ
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('exact strategy score is <= fuzzy strategy score for same resume+JD', () => {
    const resumeWithAliases = 'Skilled in js, reactjs, nodejs, and ts. Also familiar with docker containers.';
    const meta = extractMetadata(resumeWithAliases);
    const exactResult = scoreKeywordMatch(resumeWithAliases, meta, jdRequiringJs, 'exact');
    const fuzzyResult = scoreKeywordMatch(resumeWithAliases, meta, jdRequiringJs, 'fuzzy');
    // Fuzzy should match at least as much as exact (synonyms only add to score)
    expect(fuzzyResult.score).toBeGreaterThanOrEqual(exactResult.score);
  });

  it('semantic strategy score is >= fuzzy strategy score for same resume+JD', () => {
    const resumePartial = 'Experienced java developer with react framework knowledge.';
    const meta = extractMetadata(resumePartial);
    const fuzzyResult  = scoreKeywordMatch(resumePartial, meta, jdRequiringJs, 'fuzzy');
    const semanticResult = scoreKeywordMatch(resumePartial, meta, jdRequiringJs, 'semantic');
    expect(semanticResult.score).toBeGreaterThanOrEqual(fuzzyResult.score);
  });

  it('returns score of 0 when no keywords match (exact, no synonyms)', () => {
    const emptyResume = 'I have experience with cooking and baking.';
    const techJD = 'Required: Kubernetes, Terraform, Ansible, Go, Rust.';
    const meta = extractMetadata(emptyResume);
    const result = scoreKeywordMatch(emptyResume, meta, techJD, 'exact');
    expect(result.score).toBe(0);
    expect(result.matched).toHaveLength(0);
    expect(result.synonyms).toHaveLength(0);
  });
});

describe('Metadata extraction', () => {
  it('extracts contact email', () => {
    const meta = extractMetadata(SAMPLE_RESUME);
    expect(meta.contactInfo.email).toBe('john.doe@example.com');
  });

  it('extracts skills from known skill list', () => {
    const meta = extractMetadata(SAMPLE_RESUME);
    expect(meta.skills.length).toBeGreaterThan(0);
    expect(meta.skills).toContain('react');
  });

  it('detects sections', () => {
    const meta = extractMetadata(SAMPLE_RESUME);
    expect(meta.sections).toContain('experience');
    expect(meta.sections).toContain('education');
    expect(meta.sections).toContain('skills');
  });

  it('word count is correct', () => {
    const text = 'one two three four five';
    const meta = extractMetadata(text);
    expect(meta.wordCount).toBe(5);
  });

  it('does not detect tables in plain-text resume', () => {
    const meta = extractMetadata(SAMPLE_RESUME);
    expect(meta.checkmarks.tables).toBe(false);
  });

  it('detects tables when pipe characters are present', () => {
    const tableResume = 'Name | Role | Dates\nJohn | Engineer | 2020\nJane | Manager | 2021\n';
    const meta = extractMetadata(tableResume);
    expect(meta.checkmarks.tables).toBe(true);
  });
});
