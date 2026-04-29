import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildFullScoringPrompt } from "../src/lib/gemini/prompts";

// Schema definition for Gemini structured output (using strings for browser/serverless compatibility)
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
              formatting: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  issues: { type: "array", items: { type: "string" } },
                  details: { type: "array", items: { type: "string" } }
                },
                required: ["score", "issues", "details"]
              },
              keywordMatch: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  matched: { type: "array", items: { type: "string" } },
                  missing: { type: "array", items: { type: "string" } },
                  synonymMatched: { type: "array", items: { type: "string" } }
                },
                required: ["score", "matched", "missing", "synonymMatched"]
              },
              sections: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  present: { type: "array", items: { type: "string" } },
                  missing: { type: "array", items: { type: "string" } }
                },
                required: ["score", "present", "missing"]
              },
              experience: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  highlights: { type: "array", items: { type: "string" } },
                  quantifiedBullets: { type: "number" },
                  totalBullets: { type: "number" },
                  actionVerbCount: { type: "number" }
                },
                required: ["score", "quantifiedBullets", "totalBullets", "actionVerbCount", "highlights"]
              },
              education: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  notes: { type: "array", items: { type: "string" } }
                },
                required: ["score", "notes"]
              }
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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  console.log("[ATSify-API] Request received at /api/analyze");
  console.log("[ATSify-API] API Key Detection:", !!apiKey);

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing GEMINI_API_KEY on server",
      engineUsed: "deterministic-fallback"
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { resumeText, jobDescription } = body;

    console.log("[ATSify-API] Body parsed:", {
      hasResumeText: !!resumeText,
      hasJobDescription: !!jobDescription
    });

    if (!resumeText || typeof resumeText !== "string") {
      return res.status(400).json({
        error: "resumeText is required",
        engineUsed: "deterministic-fallback"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = "gemini-2.5-flash";
    console.log("[ATSify-API] Using model:", modelName);

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ATS_SCHEMA as any,
        temperature: 0.1
      }
    });

    console.log("[ATSify-API] Starting Gemini ATS request...");
    const prompt = buildFullScoringPrompt(resumeText, jobDescription);

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const duration = Date.now() - startTime;

    const text = response.text();
    console.log(`[ATSify-API] Gemini Success (${duration}ms)`);

    // 4. Server-side validation
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error("[ATSify-API] JSON Parse Error:", text);
      throw new Error("Gemini returned invalid JSON");
    }

    if (!parsed || !parsed.results || !Array.isArray(parsed.results)) {
      console.error("[ATSify-API] Validation Failed: results array missing", parsed);
      throw new Error("Gemini response missing results array");
    }

    console.log("[ATSify-API] Validation Success. Results count:", parsed.results.length);

    return res.status(200).json({
      results: parsed.results,
      engineUsed: "gemini"
    });
  } catch (error: any) {
    console.error("[ATSify-API] Gemini Analysis Failed:", error);
    return res.status(500).json({
      error: error?.message || "Unknown server error",
      details: String(error),
      engineUsed: "deterministic-fallback"
    });
  }
}