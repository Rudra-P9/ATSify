import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SchemaType } from "@google/generative-ai";
import { buildFullScoringPrompt } from "../../../lib/gemini/prompts";

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

export async function POST(req: any) {
    const { resumeText, jobDescription } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("[ATSify-Server] API Key Detected:", !!apiKey);

    if (!apiKey) {
        console.error("[ATSify-Server] Missing GEMINI_API_KEY");
        return { error: "Server configuration error", status: 500 };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = "gemini-2.5-flash";
        console.log("[ATSify-Server] Using model:", modelName);

        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: ATS_SCHEMA,
                temperature: 0.1
            }
        });

        console.log("[ATSify-Server] Starting Gemini request...");
        const prompt = buildFullScoringPrompt(resumeText, jobDescription);

        const startTime = Date.now();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const duration = Date.now() - startTime;

        const text = response.text();
        console.log(`[ATSify-Server] Gemini Success (${duration}ms)`);

        return { results: JSON.parse(text).results, status: 200 };
    } catch (err: any) {
        console.error("[ATSify-Server] Gemini Error:", err.message);
        return { error: err.message, status: 500 };
    }
}
