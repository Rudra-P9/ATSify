import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ATSResult {
  system: string;
  vendor: string;
  overallScore: number;
  passesFilter: boolean;
  breakdown: {
    formatting: {
      score: number;
      issues: string[];
      details: string[];
    };
    keywordMatch: {
      score: number;
      matched: string[];
      missing: string[];
      synonymMatched: string[];
    };
    sections: {
      score: number;
      present: string[];
      missing: string[];
    };
    experience: {
      score: number;
      quantifiedBullets: number;
      totalBullets: number;
      actionVerbCount: number;
      highlights: string[];
    };
    education: {
      score: number;
      notes: string[];
    };
  };
  suggestions: string[];
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
              formatting: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                  details: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["score", "issues", "details"]
              },
              keywordMatch: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  matched: { type: Type.ARRAY, items: { type: Type.STRING } },
                  missing: { type: Type.ARRAY, items: { type: Type.STRING } },
                  synonymMatched: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["score", "matched", "missing", "synonymMatched"]
              },
              sections: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  present: { type: Type.ARRAY, items: { type: Type.STRING } },
                  missing: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["score", "present", "missing"]
              },
              experience: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  quantifiedBullets: { type: Type.NUMBER },
                  totalBullets: { type: Type.NUMBER },
                  actionVerbCount: { type: Type.NUMBER },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["score", "quantifiedBullets", "totalBullets", "actionVerbCount", "highlights"]
              },
              education: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.NUMBER },
                  notes: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["score", "notes"]
              }
            },
            required: ["formatting", "keywordMatch", "sections", "experience", "education"]
          },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["system", "vendor", "overallScore", "passesFilter", "breakdown", "suggestions"]
      }
    }
  },
  required: ["results"]
};

export async function analyzeResume(resumeText: string, jobDescription?: string): Promise<ATSResult[]> {
  const prompt = `
    You are an expert ATS (Applicant Tracking System) simulation engine. 
    Analyze the following resume text and provide specialized scoring for 6 major ATS platforms: 
    Workday, Taleo by Oracle, iCIMS, Greenhouse, Lever by Employ, and SuccessFactors by SAP.

    RESUME TEXT:
    ${resumeText}

    ${jobDescription ? `JOB DESCRIPTION:\n${jobDescription}` : 'No job description provided. Perform a general ATS readiness check.'}

    Return a JSON object containing a "results" array with exactly 6 elements.
    Each element must reflect the unique parsing and matching quirks of that specific platform:
    1. Workday: Known for exact matching and strict section headers.
    2. Taleo: Extremely strict, often skips complex layouts, prioritizes keywords.
    3. iCIMS: Balances parsing with candidate profile strength.
    4. Greenhouse: More modern, better at semantic matching but still values structure.
    5. Lever: Focuses heavily on skills extraction and social proof.
    6. SuccessFactors: Enterprise-grade, complex weighted scoring based on job reqs.
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
  const parsed = JSON.parse(response.text.trim());
  return parsed.results;
}
