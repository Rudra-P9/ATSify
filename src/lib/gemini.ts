import { GoogleGenAI, Type } from "@google/genai";
import { runDeterministicEngine } from "./engine";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
export interface ResumeMetadata {
  wordCount: number;
  sections: string[];
  skills: string[];
  positions: number;
  education: string[];
  contactInfo: {
    email?: string;
    phone?: string;
    linkedin?: string;
    location?: string;
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
    formatting: { score: number; issues: string[] };
    keywordMatch: { score: number; matched: string[]; missing: string[]; synonyms: string[] };
    sections: { score: number; present: string[]; missing: string[] };
    experience: { score: number; highlights: string[]; quantifiedBullets: number; totalBullets: number; actionVerbCount: number };
    education: { score: number; notes: string[] };
    quantification: { score: number; ratio: number };
  };
  suggestions: { text: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; platforms: string[] }[];
  focusAreas: { label: string; score: number; platformAvg: number }[];
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
              formatting: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, issues: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "issues"] },
              keywordMatch: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, matched: { type: Type.ARRAY, items: { type: Type.STRING } }, missing: { type: Type.ARRAY, items: { type: Type.STRING } }, synonyms: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "matched", "missing", "synonyms"] },
              sections: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, present: { type: Type.ARRAY, items: { type: Type.STRING } }, missing: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "present", "missing"] },
              experience: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, highlights: { type: Type.ARRAY, items: { type: Type.STRING } }, quantifiedBullets: { type: Type.NUMBER }, totalBullets: { type: Type.NUMBER }, actionVerbCount: { type: Type.NUMBER } }, required: ["score", "highlights"] },
              education: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, notes: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score"] },
              quantification: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, ratio: { type: Type.NUMBER } }, required: ["score", "ratio"] }
            },
            required: ["formatting", "keywordMatch", "sections", "experience", "education", "quantification"]
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                platforms: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["text", "priority", "platforms"]
            }
          },
          focusAreas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                score: { type: Type.NUMBER },
                platformAvg: { type: Type.NUMBER }
              },
              required: ["label", "score", "platformAvg"]
            }
          }
        },
        required: ["system", "vendor", "overallScore", "passesFilter", "breakdown", "suggestions", "focusAreas"]
      }
    },
    metadata: {
      type: Type.OBJECT,
      properties: {
        wordCount: { type: Type.NUMBER },
        sections: { type: Type.ARRAY, items: { type: Type.STRING } },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
        positions: { type: Type.NUMBER },
        education: { type: Type.ARRAY, items: { type: Type.STRING } },
        contactInfo: {
          type: Type.OBJECT,
          properties: {
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            location: { type: Type.STRING }
          }
        },
        checkmarks: {
          type: Type.OBJECT,
          properties: {
            multiColumn: { type: Type.BOOLEAN },
            tables: { type: Type.BOOLEAN },
            images: { type: Type.BOOLEAN }
          },
          required: ["multiColumn", "tables", "images"]
        }
      },
      required: ["wordCount", "sections", "skills", "positions", "education", "checkmarks"]
    }
  },
  required: ["results", "metadata"]
};

export async function analyzeResume(resumeText: string, jobDescription?: string): Promise<AnalysisResponse> {
  // Attempt Gemini analysis only when an API key is configured and ai is valid
  if (apiKey && ai) {
    try {
      const prompt = `
    Analyze the following resume text and provide a detailed ATS simulation report based on our "Big Picture" scoring engine.

    RESUME TEXT:
    ${resumeText}

    ${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : 'Perform a general ATS readiness check against industry standards.'}

    ### SCORING METHODOLOGY (THE BIG PICTURE)
    Evaluate the resume against 6 unique platform profiles. Each platform score (Sp) is:
    Sp = clamp(0, 100, Σ(wi(p) * di) - Qp)
    Where di are dimensions 1-6, wi(p) are platform-specific weights, and Qp are quirk penalties.

    ### DIMENSION DEFINITIONS (d1-d6)
    d1 (Formatting): Deduction-based. F = max(0, 100 - Σ(pk * sigma)).
       - Penalties (pk): Multi-column(15), Tables(12), Images(8), Pages > 2(5), Word count < 150(10), Word count > 1500(3), High special char ratio(8), All-caps lines(3), Inconsistent bullets(2).
       - Scale deductions by platform strictness (sigma).
    d2 (Keyword Match): K = min(100, (|M| + 0.8*|S|) / |J| * 100).
       - M = exact matches, S = synonyms/partials, J = JD distinct keywords.
       - Strategies: 
          * Exact (Taleo, Workday, SuccessFactors): S is ALWAYS empty (count=0). Only literal matches.
          * Fuzzy (iCIMS): S includes synonym database matches.
          * Semantic (Greenhouse, Lever): S includes synonyms + partial string containment (>=3 chars).
    d3 (Section Completeness): Presence of Contact, Experience, Education, Skills (required) + Summary, Certs, Projects (bonus).
    d4 (Experience Relevance): Bullet quality (quantified achievements, action verbs, recency, field relevance).
    d5 (Education Match): Degree, institution, and date formatting.
    d6 (Quantification): d6 = (bullets with numbers / total experience bullets) * 100.

    ### PLATFORM PROFILES
    - Workday: Weights [0.25, 0.30, 0.15, 0.15, 0.10, 0.05] | Passing: 70 | sigma: 0.90 | Strategy: Exact | Quirks: Non-standard headers(-5), Pages > 2(-8).
    - Taleo: Weights [0.20, 0.35, 0.15, 0.15, 0.10, 0.05] | Passing: 75 | sigma: 0.85 | Strategy: Exact | Quirks: Low skill density(-10), Missing standard sections(-8).
    - iCIMS: Weights [0.15, 0.30, 0.15, 0.20, 0.10, 0.10] | Passing: 60 | sigma: 0.60 | Strategy: Fuzzy.
    - Greenhouse: Weights [0.10, 0.25, 0.10, 0.25, 0.10, 0.20] | Passing: 50 | sigma: 0.40 | Strategy: Semantic.
    - Lever: Weights [0.08, 0.22, 0.10, 0.30, 0.10, 0.20] | Passing: 50 | sigma: 0.35 | Strategy: Semantic.
    - SuccessFactors: Weights [0.25, 0.25, 0.20, 0.15, 0.10, 0.05] | Passing: 65 | sigma: 0.85 | Strategy: Exact.

    ### RESPOND IN JSON:
    Return exactly 6 results in the "results" array. For each:
    - Compute Sp using the math above.
    - "passesFilter": true if Sp >= Passing threshold.
    - Populate "breakdown" details faithfully based on observed resume features.
    - Extract "metadata" with contact info, skills, and layout checkmarks.
  `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: ATS_SCHEMA
        }
      });

      if (!response.text) throw new Error("No response from AI");
      const parsed = JSON.parse(response.text.trim()) as AnalysisResponse;
      // Basic schema validation: must have exactly 6 results
      if (!parsed?.results || parsed.results.length !== 6) {
        throw new Error("Gemini response did not contain exactly 6 results");
      }
      return parsed;
    } catch (err) {
      console.warn("[ATSify] Gemini unavailable – falling back to deterministic engine:", err);
    }
  }

  // Fallback: deterministic rule-based scoring engine
  return runDeterministicEngine(resumeText, jobDescription);
}

