import { GoogleGenAI, Type } from "@google/genai";
import { runDeterministicEngine } from "./engine";
import { ParsedDocument } from "./parser/types";
import { buildFullScoringPrompt } from "./gemini/prompts";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
export interface ResumeMetadata {
  wordCount: number;
  sections: string[];
  skills: string[];
  positions: number;
  education: string[];
  contactInfo: {
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

export async function analyzeResume(doc: ParsedDocument, jobDescription?: string): Promise<AnalysisResponse> {
  const metadata: ResumeMetadata = {
    wordCount: doc.metadata.wordCount,
    sections: doc.sections.map(s => s.type),
    skills: doc.skills,
    positions: doc.experience.length,
    education: doc.education.map(e => e.degree || e.rawText),
    contactInfo: doc.contact,
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
      console.warn("[ATSify] Gemini unavailable – falling back to deterministic engine:", err);
    }
  }

  // Fallback: deterministic rule-based scoring engine (stub if needed, or route via pipeline)
  // For now, return a synthesized AnalysisResponse from the deterministic engine
  // wait, runDeterministicEngine requires `resumeText`. We can just call it with doc.rawText
  return runDeterministicEngine(doc.rawText, jobDescription);
}