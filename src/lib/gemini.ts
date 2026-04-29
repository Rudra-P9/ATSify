import { GoogleGenAI, Type } from "@google/genai";
import { scoreResume } from "./scorer/engine";
import { extractMetadata } from "./engine/metadata";
import { ParsedDocument } from "./parser/types";
import { buildFullScoringPrompt } from "./gemini/prompts";
import type { ScoringInput, ScoreResult } from "./scorer/types";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
}

export interface AnalysisResponse {
  results: ATSResult[];
  metadata: ResumeMetadata;
}

const ATS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          system: { type: Type.STRING },
          vendor: { type: Type.STRING },
          overallScore: { type: Type.NUMBER },
          passesFilter: { type: Type.BOOLEAN },
          breakdown: {
            type: Type.OBJECT,
            properties: {
              formatting: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, issues: { type: Type.ARRAY, items: { type: Type.STRING } }, details: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "issues", "details"] },
              keywordMatch: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, matched: { type: Type.ARRAY, items: { type: Type.STRING } }, missing: { type: Type.ARRAY, items: { type: Type.STRING } }, synonymMatched: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "matched", "missing", "synonymMatched"] },
              sections: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, present: { type: Type.ARRAY, items: { type: Type.STRING } }, missing: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "present", "missing"] },
              experience: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, highlights: { type: Type.ARRAY, items: { type: Type.STRING } }, quantifiedBullets: { type: Type.NUMBER }, totalBullets: { type: Type.NUMBER }, actionVerbCount: { type: Type.NUMBER } }, required: ["score", "quantifiedBullets", "totalBullets", "actionVerbCount", "highlights"] },
              education: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, notes: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "notes"] }
            },
            required: ["formatting", "keywordMatch", "sections", "experience", "education"]
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                details: { type: Type.ARRAY, items: { type: Type.STRING } },
                impact: { type: Type.STRING, enum: ["critical", "high", "medium", "low"] },
                platforms: { type: Type.ARRAY, items: { type: Type.STRING } }
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
    suggestions: result.suggestions.map(s => classifySuggestion(s, result.system))
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

  // Attempt Gemini analysis only when an API key is configured and ai is valid
  if (apiKey && ai) {
    try {
      const prompt = buildFullScoringPrompt(doc.rawText, jobDescription);

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: ATS_SCHEMA,
          temperature: 0.1
        }
      });

      if (!response.text) throw new Error("No response from AI");
      const parsed = JSON.parse(response.text.trim());

      // Basic schema validation: must have exactly 6 results
      if (!parsed?.results || parsed.results.length !== 6) {
        throw new Error("Gemini response did not contain exactly 6 results");
      }

      return {
        results: parsed.results as ATSResult[],
        metadata
      };
    } catch (err) {
      console.warn("[ATSify] Gemini unavailable – falling back to scorer engine:", err);
    }
  }

  // Fallback: deterministic scorer pipeline with platform profiles
  const scoringInput = buildScoringInput(doc, jobDescription);
  const scoreResults = scoreResume(scoringInput);
  const results = adaptScorerResults(scoreResults);

  return { results, metadata };
}