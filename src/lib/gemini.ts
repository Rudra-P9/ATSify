import { scoreResume } from "./scorer/engine";
import { extractMetadata } from "./engine/metadata";
import { ParsedDocument } from "./parser/types";
import { buildFullScoringPrompt } from "./gemini/prompts";
import type { ScoringInput, ScoreResult } from "./scorer/types";

// Client-side key detection is now for legacy/debug info only
const apiKey = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : null) || (import.meta as any).env?.VITE_GEMINI_API_KEY;

export interface ResumeMetadata {
  wordCount: number;
  sections: string[];
  skills: string[];
  positions: number;
  education: string[];
  contactInfo: {
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    location: string | null;
  };
  checkmarks: {
    multiColumn: boolean;
    tables: boolean;
    images: boolean;
  };
}

export interface ATSResult {
  system: string;
  vendor: string;
  overallScore: number;
  passesFilter: boolean;
  breakdown: {
    formatting: { score: number; issues: string[]; details: string[] };
    keywordMatch: { score: number; matched: string[]; missing: string[]; synonymMatched: string[] };
    sections: { score: number; present: string[]; missing: string[] };
    experience: { score: number; highlights: string[]; quantifiedBullets: number; totalBullets: number; actionVerbCount: number };
    education: { score: number; notes: string[] };
  };
  suggestions: { summary: string; details: string[]; impact: 'critical' | 'high' | 'medium' | 'low'; platforms: string[] }[];
  engineUsed: 'gemini' | 'deterministic-fallback';
}

export interface AnalysisResponse {
  results: ATSResult[];
  metadata: ResumeMetadata;
}

const ATS_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          system: { type: "string" },
          vendor: { type: "string" },
          overallScore: { type: "number" },
          passesFilter: { type: "boolean" },
          breakdown: {
            type: "object",
            properties: {
              formatting: { type: "object", properties: { score: { type: "number" }, issues: { type: "array", items: { type: "string" } }, details: { type: "array", items: { type: "string" } } }, required: ["score", "issues", "details"] },
              keywordMatch: { type: "object", properties: { score: { type: "number" }, matched: { type: "array", items: { type: "string" } }, missing: { type: "array", items: { type: "string" } }, synonymMatched: { type: "array", items: { type: "string" } } }, required: ["score", "matched", "missing", "synonymMatched"] },
              sections: { type: "object", properties: { score: { type: "number" }, present: { type: "array", items: { type: "string" } }, missing: { type: "array", items: { type: "string" } } }, required: ["score", "present", "missing"] },
              experience: { type: "object", properties: { score: { type: "number" }, highlights: { type: "array", items: { type: "string" } }, quantifiedBullets: { type: "number" }, totalBullets: { type: "number" }, actionVerbCount: { type: "number" } }, required: ["score", "quantifiedBullets", "totalBullets", "actionVerbCount", "highlights"] },
              education: { type: "object", properties: { score: { type: "number" }, notes: { type: "array", items: { type: "string" } } }, required: ["score", "notes"] }
            },
            required: ["formatting", "keywordMatch", "sections", "experience", "education"]
          },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                summary: { type: "string" },
                details: { type: "array", items: { type: "string" } },
                impact: { type: "string", enum: ["critical", "high", "medium", "low"] },
                platforms: { type: "array", items: { type: "string" } }
              },
              required: ["summary", "details", "impact", "platforms"]
            }
          }
        },
        required: ["system", "vendor", "overallScore", "passesFilter", "breakdown", "suggestions"]
      }
    }
  },
  required: ["results"]
};

// ---------------------------------------------------------------------------
// Adapter: converts scorer ScoreResult[] → ATSResult[] (UI-expected format)
// ---------------------------------------------------------------------------

/**
 * Converts flat suggestion strings from the deterministic scorer into
 * structured suggestion objects expected by the UI.
 */
function classifySuggestion(
  text: string,
  platform: string
): ATSResult['suggestions'][0] {
  // Determine impact level based on keywords in the suggestion
  let impact: 'critical' | 'high' | 'medium' | 'low' = 'medium';
  const lower = text.toLowerCase();

  if (lower.includes('missing keywords') || lower.includes('missing sections') || lower.includes('exact keyword matching')) {
    impact = 'critical';
  } else if (lower.includes('add ') || lower.includes('remove ') || lower.includes('switch to')) {
    impact = 'high';
  } else if (lower.includes('consider') || lower.includes('ensure')) {
    impact = 'medium';
  } else {
    impact = 'low';
  }

  return {
    summary: text,
    details: [text],
    impact,
    platforms: [platform]
  };
}

/**
 * Converts ScoreResult[] from the scorer engine into ATSResult[] for the UI.
 * The breakdown shapes are compatible; only suggestions need restructuring.
 */
function adaptScorerResults(scoreResults: ScoreResult[]): ATSResult[] {
  return scoreResults.map(result => ({
    system: result.system,
    vendor: result.vendor,
    overallScore: result.overallScore,
    passesFilter: result.passesFilter,
    breakdown: result.breakdown,
    suggestions: result.suggestions.map(s => classifySuggestion(s, result.system)),
    engineUsed: 'deterministic-fallback'
  }));
}

// ---------------------------------------------------------------------------
// Builds a ScoringInput from a ParsedDocument for the scorer engine
// ---------------------------------------------------------------------------

function buildScoringInput(doc: ParsedDocument, jobDescription?: string): ScoringInput {
  // Extract bullet points from experience entries (populated by parser)
  const experienceBullets = doc.experience.flatMap(entry => entry.bullets);

  // If parser didn't extract bullets, fall back to extracting from raw text
  const fallbackBullets = experienceBullets.length > 0
    ? experienceBullets
    : doc.rawText.split('\n')
      .map(l => l.trim())
      .filter(l => /^[-•·▪◦▸►‣*]\s/.test(l) || /^\d+\.\s/.test(l))
      .map(l => l.replace(/^[-•·▪◦▸►‣*]\s*/, '').replace(/^\d+\.\s*/, ''));

  // Extract education text from education entries or sections
  const educationText = doc.education.length > 0
    ? doc.education.map(e => e.rawText).join('\n\n')
    : doc.sections
      .filter(s => s.type === 'education')
      .map(s => s.content)
      .join('\n\n');

  return {
    hasMultipleColumns: doc.metadata.hasMultipleColumns,
    hasTables: doc.metadata.hasTables,
    hasImages: doc.metadata.hasImages,
    pageCount: doc.metadata.pageCount,
    wordCount: doc.metadata.wordCount,
    resumeText: doc.rawText,
    resumeSections: doc.sections.map(s => s.type),
    experienceBullets: fallbackBullets,
    educationText,
    jobDescription,
    resumeSkills: doc.skills || []
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function analyzeResume(doc: ParsedDocument, jobDescription?: string): Promise<AnalysisResponse> {
  // Build metadata from parser outputs (now populated), with engine extraction as supplement
  const extracted = extractMetadata(doc.rawText);
  const metadata: ResumeMetadata = {
    wordCount: doc.metadata.wordCount,
    sections: doc.sections.map(s => s.type),
    skills: doc.skills.length > 0 ? doc.skills : extracted.skills,
    positions: doc.experience.length > 0 ? doc.experience.length : extracted.positions,
    education: doc.education.length > 0
      ? doc.education.map(e => e.degree ? `${e.degree} in ${e.field}`.trim() : e.rawText)
      : extracted.education,
    contactInfo: {
      name: doc.contact.name,
      email: doc.contact.email,
      phone: doc.contact.phone,
      linkedin: doc.contact.linkedin,
      location: doc.contact.location
    },
    checkmarks: {
      multiColumn: doc.metadata.hasMultipleColumns,
      tables: doc.metadata.hasTables,
      images: doc.metadata.hasImages
    }
  };

  // 2. Detection Logging
  console.log("[ATSify-Debug] Client-side API Key Detected:", !!apiKey);

  // Attempt server-side Gemini analysis
  try {
    console.log("[ATSify-Trace] Requesting Gemini analysis from server...");
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resumeText: doc.rawText, 
        jobDescription 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server returned ${response.status}`);
    }

    const data = await response.json();
    console.log("[ATSify-Trace] Gemini Analysis Received from Server");

    return {
      results: (data.results as ATSResult[]).map(r => ({ ...r, engineUsed: 'gemini' })),
      metadata
    };
  } catch (err) {
    console.warn("[ATSify-Trace] Fallback Activation – Server-side Gemini failed:", err);
  }

  // Fallback: deterministic scorer pipeline with platform profiles
  console.log("[ATSify-Trace] Executing Deterministic Scorer Engine...");
  const scoringInput = buildScoringInput(doc, jobDescription);
  const scoreResults = scoreResume(scoringInput);
  const results = adaptScorerResults(scoreResults);
  
  console.log("[ATSify-Trace] Deterministic Engine Completion. Results:", results.length);

  return { results, metadata };
}