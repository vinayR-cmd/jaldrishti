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

export function getStandardWaterDetails(tds: number): WaterAnalysis {
  if (tds <= 50) {
    return {
      score: "Risk",
      tds_level: tds,
      recommendation: "Remineralize",
      explanation: `TDS level of ${tds} PPM is very low. Water may lack essential minerals and taste flat.`,
      side_effects: ["Deficiency in essential minerals like Calcium and Magnesium", "Flat or unpalatable taste", "Increased risk of metal leaching from pipes"],
      improvement_tips: ["Use a remineralization filter to add essential minerals back", "Blend with mineral water", "Check plumbing for corrosion"]
    };
  } else if (tds <= 150) {
    return {
      score: "Safe",
      tds_level: tds,
      recommendation: "Drink Directly",
      explanation: `TDS level of ${tds} PPM is excellent. Ideal mineral balance for drinking water.`,
      side_effects: ["None. This is considered ideal drinking water.", "Promotes good hydration"],
      improvement_tips: ["Maintain current water source", "Store in clean, safe containers", "Periodic testing to ensure consistency"]
    };
  } else if (tds <= 250) {
    return {
      score: "Safe",
      tds_level: tds,
      recommendation: "Drink Directly",
      explanation: `TDS level of ${tds} PPM is good and highly acceptable for drinking.`,
      side_effects: ["None. Safe for daily consumption", "Good mineral intake"],
      improvement_tips: ["Maintain standard hygiene", "Clean water storage tanks regularly"]
    };
  } else if (tds <= 300) {
    return {
      score: "Safe",
      tds_level: tds,
      recommendation: "Acceptable",
      explanation: `TDS level of ${tds} PPM is fair. Acceptable for drinking but slightly high.`,
      side_effects: ["Very mild alteration in taste", "Minimal chance of scaling in appliances"],
      improvement_tips: ["Consider a basic carbon filter if taste is an issue", "Boil water if biological safety is a concern"]
    };
  } else if (tds <= 500) {
    return {
      score: "Risk",
      tds_level: tds,
      recommendation: "Filter",
      explanation: `TDS level of ${tds} PPM is poor. Noticeable taste change and potential for hardness.`,
      side_effects: ["Slightly unpleasant or salty taste", "Potential for mild gastrointestinal irritation", "Scaling in kettles and pipes"],
      improvement_tips: ["Use a Reverse Osmosis (RO) filter", "Use water softeners for household usage", "Avoid drinking continuously without filtration"]
    };
  } else if (tds <= 1200) {
    return {
      score: "Unsafe",
      tds_level: tds,
      recommendation: "Avoid / Treat Heavily",
      explanation: `TDS level of ${tds} PPM is unacceptable. High mineral or contaminant content.`,
      side_effects: ["Upset stomach and gastrointestinal issues", "High risk of kidney stones over long term", "Strong salty or metallic taste", "Severe scale buildup"],
      improvement_tips: ["Immediate use of high-quality RO purification system", "Do not consume directly under any circumstances", "Consult local water authorities", "Consider alternative drinking water sources"]
    };
  } else {
    return {
      score: "Unsafe",
      tds_level: tds,
      recommendation: "Do Not Drink",
      explanation: `TDS level of ${tds} PPM is highly unsafe and potentially toxic.`,
      side_effects: ["Toxicity from heavy metals or harmful salts", "Severe dehydration symptoms", "Severe digestive and kidney complications", "Completely unpalatable"],
      improvement_tips: ["Strictly avoid consumption", "Use bottled water exclusively", "Requires industrial-grade distillation", "Report to local authorities immediately"]
    };
  }
}

export async function analyzeWaterQuality(tds: number, reports: any[]): Promise<WaterAnalysis> {
  const reportSummary = reports.map(r => `${r.issue_type}: ${r.description}`).join(", ");
  const baseDetails = getStandardWaterDetails(tds);

  const prompt = `Analyze water quality with TDS level: ${tds} ppm. 
  Community reports in the area: ${reportSummary || "None"}.
  General baseline data we know for this level:
  - Safety Score: ${baseDetails.score}
  - Side effects: ${baseDetails.side_effects.join(', ')}
  - Tips: ${baseDetails.improvement_tips.join(', ')}
  
  Provide:
  1. A safety score (Safe, Risk, Unsafe).
  2. A clear recommendation.
  3. A brief explanation fusing the standard data with community reports.
  4. A list of potential side effects of drinking this water (incorporate standard range data).
  5. A list of practical tips to improve this water quality at home (incorporate standard range data).
  Return ONLY a JSON object with keys: score, tds_level, recommendation, explanation, side_effects, improvement_tips.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanText);

    // Ensure arrays exist
    if (!Array.isArray(parsed.side_effects)) parsed.side_effects = baseDetails.side_effects;
    if (!Array.isArray(parsed.improvement_tips)) parsed.improvement_tips = baseDetails.improvement_tips;

    return parsed;
  } catch (e) {
    console.error("Failed to parse Gemini response or no API key, falling back to standard TDS index range data.", e);
    return baseDetails;
  }
}
