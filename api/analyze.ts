import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
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
      model: modelName
    });

    console.log("[ATSify-API] Sending minimal Gemini test request...");
    const result = await model.generateContent("Say hello in one sentence.");
    const text = result.response.text();

    console.log("[ATSify-API] Gemini minimal test success:", text);

    return res.status(200).json({
      ok: true,
      engineUsed: "gemini",
      text
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