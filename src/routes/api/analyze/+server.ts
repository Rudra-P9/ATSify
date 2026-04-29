import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { buildFullScoringPrompt } from "../../../lib/gemini/prompts";

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
