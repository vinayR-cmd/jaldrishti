import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

export interface WaterAnalysis {
  score: "Safe" | "Risk" | "Unsafe";
  tds_level: number;
  recommendation: string;
  explanation: string;
  side_effects: string[];
  improvement_tips: string[];
}

export async function analyzeWaterQuality(tds: number, reports: any[]): Promise<WaterAnalysis> {
  const reportSummary = reports.map(r => `${r.issue_type}: ${r.description}`).join(", ");

  const prompt = `Analyze water quality with TDS level: ${tds} ppm. 
  Community reports in the area: ${reportSummary || "None"}.
  Provide:
  1. A safety score (Safe, Risk, Unsafe).
  2. A clear recommendation (Boil, Filter, Avoid, or Drink Directly).
  3. A brief explanation.
  4. A list of potential side effects of drinking this water.
  5. A list of practical tips to improve this water quality at home.
  Return ONLY a JSON object with keys: score, tds_level, recommendation, explanation, side_effects, improvement_tips.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return {
      score: tds < 300 ? "Safe" : tds < 600 ? "Risk" : "Unsafe",
      tds_level: tds,
      recommendation: tds < 300 ? "Drink Directly" : tds < 600 ? "Filter" : "Avoid",
      explanation: "Analysis based on standard TDS thresholds.",
      side_effects: tds > 500 ? ["Stomach upset", "Mineral buildup in body"] : ["None expected"],
      improvement_tips: tds > 300 ? ["Use a RO filter", "Boil before drinking"] : ["Keep storage clean"]
    };
  }
}
