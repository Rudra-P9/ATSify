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

/**
 * Robust JSON extraction for AI responses
 */
function extractJSON(raw: string) {
  const trimmed = raw.trim();

  // attempt 1: direct parse
  try {
    return JSON.parse(trimmed);
  } catch { }

  // attempt 2: remove markdown fences
  const cleaned = trimmed.replace(/```json\n?|\n?```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch { }

  // attempt 3: extract { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch { }
  }

  return null;
}


const SYSTEMS = [
  "Workday",
  "Taleo",
  "iCIMS",
  "Greenhouse",
  "Lever",
  "SuccessFactors"
];

function normalizeName(name: string) {
  const n = name.toLowerCase();

  if (n.includes("workday")) return "Workday";
  if (n.includes("taleo")) return "Taleo";
  if (n.includes("icims")) return "iCIMS";
  if (n.includes("greenhouse")) return "Greenhouse";
  if (n.includes("lever")) return "Lever";
  if (n.includes("success") || n.includes("sap")) return "SuccessFactors";

  return name;
}

function normalizeResults(results: any[]) {
  const map = new Map(
    results.map(r => [normalizeName(r.system), r])
  );

  return SYSTEMS.map(system => {
    if (map.has(system)) return map.get(system);

    // fallback only if missing
    return {
      system,
      vendor: "",
      overallScore: 0,
      passesFilter: false,
      breakdown: {
        formatting: { score: 0, issues: [], details: [] },
        keywordMatch: { score: 0, matched: [], missing: [], synonymMatched: [] },
        sections: { score: 0, present: [], missing: [] },
        experience: { score: 0, quantifiedBullets: 0, totalBullets: 0, actionVerbCount: 0, highlights: [] },
        education: { score: 0, notes: [] }
      },
      suggestions: []
    };
  });
}

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
    const prompt = `
    Analyze this resume briefly and return JSON:
    ${resumeText.slice(0, 2000)}
    `;

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const duration = Date.now() - startTime;

    const text = response.text();
    console.log(`[ATSify-API] Gemini Success (${duration}ms)`);
    console.log("[ATSify-API] Raw Gemini output:", text.slice(0, 200));

    // 4. Server-side validation with robust extraction
    const parsed = extractJSON(text);

    if (!parsed) {
      console.error("[ATSify-API] JSON extraction failed:", text);

      return res.status(500).json({
        error: "Gemini returned invalid or unparsable JSON",
        raw: text.slice(0, 300),
        engineUsed: "deterministic-fallback"
      });
    }

    console.log(
      "[ATSify-API] RAW Gemini systems:",
      parsed.results?.map((r: any) => r.system)
    );

    if (!parsed.results || !Array.isArray(parsed.results)) {
      console.error("[ATSify-API] Validation Failed: results array missing", parsed);
      return res.status(500).json({
        error: "Gemini response missing results array",
        engineUsed: "deterministic-fallback"
      });
    }

    const normalized = normalizeResults(parsed.results);

    console.log("[ATSify-API] Normalized results count:", normalized.length);

    return res.status(200).json({
      results: normalized,
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