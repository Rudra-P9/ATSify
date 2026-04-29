import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { scoreResume } from "./scorer/engine";
import { extractMetadata } from "./engine/metadata";
import { ParsedDocument } from "./parser/types";
import { buildFullScoringPrompt } from "./gemini/prompts";
import type { ScoringInput, ScoreResult } from "./scorer/types";

const apiKey = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : null) || (import.meta as any).env?.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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
  type: SchemaType.OBJECT,
  properties: {
    results: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          system: { type: SchemaType.STRING },
          vendor: { type: SchemaType.STRING },
          overallScore: { type: SchemaType.NUMBER },
          passesFilter: { type: SchemaType.BOOLEAN },
          breakdown: {
            type: SchemaType.OBJECT,
            properties: {
              formatting: { type: SchemaType.OBJECT, properties: { score: { type: SchemaType.NUMBER }, issues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, details: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["score", "issues", "details"] },
              keywordMatch: { type: SchemaType.OBJECT, properties: { score: { type: SchemaType.NUMBER }, matched: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, missing: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, synonymMatched: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["score", "matched", "missing", "synonymMatched"] },
              sections: { type: SchemaType.OBJECT, properties: { score: { type: SchemaType.NUMBER }, present: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, missing: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["score", "present", "missing"] },
              experience: { type: SchemaType.OBJECT, properties: { score: { type: SchemaType.NUMBER }, highlights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, quantifiedBullets: { type: SchemaType.NUMBER }, totalBullets: { type: SchemaType.NUMBER }, actionVerbCount: { type: SchemaType.NUMBER } }, required: ["score", "quantifiedBullets", "totalBullets", "actionVerbCount", "highlights"] },
              education: { type: SchemaType.OBJECT, properties: { score: { type: SchemaType.NUMBER }, notes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["score", "notes"] }
            },
            required: ["formatting", "keywordMatch", "sections", "experience", "education"]
          },
          suggestions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                summary: { type: SchemaType.STRING },
                details: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                impact: { type: SchemaType.STRING, enum: ["critical", "high", "medium", "low"] },
                platforms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
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
  console.log("[ATSify-Debug] API Key Detected:", !!apiKey);
  console.log("[ATSify-Debug] genAI Client Initialized:", !!genAI);

  // Attempt Gemini analysis only when an API key is configured and genAI is valid
  if (apiKey && genAI) {
    try {
      const modelName = "gemini-2.5-flash";
      console.log("[ATSify-Trace] Model Name Used:", modelName);
      
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: ATS_SCHEMA,
          temperature: 0.1
        }
      });

      // Step 4: Simple test call
      console.log("[ATSify-Trace] Executing pre-analysis test call...");
      const testResult = await model.generateContent("Say hello in one sentence");
      console.log("[ATSify-Test] Gemini Test Response:", testResult.response.text());

      console.log("[ATSify-Trace] Starting Gemini AI request...");
      const prompt = buildFullScoringPrompt(doc.rawText, jobDescription);

      const startTime = Date.now();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const duration = Date.now() - startTime;

      const text = response.text();
      if (!text) {
        console.error("[ATSify-Trace] Gemini Failure: Empty response text");
        throw new Error("No response from AI");
      }
      
      const parsed = JSON.parse(text.trim());
      console.log(`[ATSify-Trace] Gemini Success (${duration}ms)`);
      console.log("[ATSify-Debug] Gemini results returned:", parsed?.results?.length);

      // Basic schema validation: must have exactly 6 results
      if (!parsed?.results || parsed.results.length !== 6) {
        console.warn("[ATSify-Debug] Validation Failed: Expected 6 results, got", parsed?.results?.length);
        throw new Error("Gemini response did not contain exactly 6 results");
      }

      // Check for required fields in first result as sample
      const sample = parsed.results[0];
      const hasRequired = sample.system && sample.overallScore !== undefined && sample.breakdown;
      console.log("[ATSify-Debug] Response Validation - Required fields present:", hasRequired);

      return {
        results: (parsed.results as ATSResult[]).map(r => ({ ...r, engineUsed: 'gemini' })),
        metadata
      };
    } catch (err) {
      console.warn("[ATSify-Trace] Fallback Activation – Gemini failed or returned error:", err);
      console.error("[ATSify-Debug] Gemini Error Detail:", err);
    }
  } else {
    console.log("[ATSify-Trace] Skipping AI path - API key or client missing");
  }

  // Fallback: deterministic scorer pipeline with platform profiles
  console.log("[ATSify-Trace] Executing Deterministic Scorer Engine...");
  const scoringInput = buildScoringInput(doc, jobDescription);
  const scoreResults = scoreResume(scoringInput);
  const results = adaptScorerResults(scoreResults);
  
  console.log("[ATSify-Trace] Deterministic Engine Completion. Results:", results.length);

  return { results, metadata };
}