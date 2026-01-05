
import { GoogleGenAI, Type } from "@google/genai";
import { InstrumentType, Pattern } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePatternFromAI = async (prompt: string): Promise<Pattern> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a 16-step rhythmic pattern based on this vibe: "${prompt}". 
    Think of the collaboration style between Shakira and Coldplay: energetic, anthemic, with Latin-Electronic elements.
    Return a JSON object representing the steps (true for active, false for inactive) for KICK, SNARE, HIHAT, and SYNTH.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          tempo: { type: Type.NUMBER },
          steps: {
            type: Type.OBJECT,
            properties: {
              KICK: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              SNARE: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              HIHAT: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
              SYNTH: { type: Type.ARRAY, items: { type: Type.BOOLEAN } },
            },
            required: ["KICK", "SNARE", "HIHAT", "SYNTH"]
          }
        },
        required: ["name", "tempo", "steps"]
      }
    }
  });

  const data = JSON.parse(response.text);
  
  // Ensure we have exactly 16 steps for each
  const sanitize = (arr: boolean[]) => {
    const base = new Array(16).fill(false);
    return base.map((val, i) => arr[i] ?? false);
  };

  return {
    name: data.name || "AI Groove",
    tempo: data.tempo || 120,
    steps: {
      [InstrumentType.KICK]: sanitize(data.steps.KICK),
      [InstrumentType.SNARE]: sanitize(data.steps.SNARE),
      [InstrumentType.HIHAT]: sanitize(data.steps.HIHAT),
      [InstrumentType.SYNTH]: sanitize(data.steps.SYNTH),
    }
  };
};
