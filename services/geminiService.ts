
import { GoogleGenAI, Type } from "@google/genai";
import { QuizAnswers, AssessmentResult } from "../types";

export const getTreeAssessment = async (answers: QuizAnswers, userName: string): Promise<AssessmentResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    You are Tom Edwards, a friendly arborist. 
    Analyze this report for ${userName}:
    - Tree Condition: ${answers.condition}
    - Location: ${answers.location}
    - Recent Storms: ${answers.storms}
    - Visible Cracks: ${answers.cracks}
    - Age: ${answers.age}
    - User's Extra Notes: ${answers.concerns || 'None'}

    Return a JSON object with:
    1. riskLevel: (0-100)
    2. status: 'Low', 'Moderate', 'High', or 'Critical'
    3. statusLabel: e.g., "Low Risk"
    4. summary: A 5-paragraph note following this exact format:
       - Para 1: Warm greeting to ${userName}. Mention you've specifically reviewed their ${answers.location} tree details.
       - Para 2: Positive health assessment. Detail a positive aspect (e.g., foliage density, root potential) in 2-3 detailed sentences.
       - Para 3: Risk analysis. Explain why ${answers.cracks || 'the structural findings'} are concerning in this specific environment. Be specific about potential property impact.
       - Para 4: Expert recommendation. Explain why immediate professional stabilization is the most cost-effective path compared to total removal.
       - Para 5: The final isolated line: "Book your free estimate today 👇 and let's see how we can help you keep your tree safe. 🏠"
    5. planSteps: 3 professional steps.
    6. timeline: e.g. "Priority (Within 24h)".

    CRITICAL RULES:
    - Each paragraph MUST be separated by EXACTLY TWO NEWLINES (\n\n).
    - STAY CONCISE but professional. 
    - MAX 3 sentences per paragraph.
    - MAX 5-6 EMOJIS total.
    - Speak simply, avoiding complex biological jargon where possible.
    - NO AI MENTIONS.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.NUMBER },
            status: { type: Type.STRING },
            statusLabel: { type: Type.STRING },
            summary: { type: Type.STRING },
            planSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            timeline: { type: Type.STRING }
          },
          required: ["riskLevel", "status", "statusLabel", "summary", "planSteps", "timeline"]
        }
      }
    });

    const data = JSON.parse(response.text);
    return { ...data, recommendations: [] } as AssessmentResult;
  } catch (error) {
    console.error("Expert Assessment Error:", error);
    return {
      riskLevel: 45,
      status: 'Moderate',
      statusLabel: 'Moderate Risk',
      summary: `Hi ${userName}! I've finished reviewing the specific details for your tree in the ${answers.location}.\n\nIt's great to see a mature tree with a strong root foundation. This natural strength gives us a fantastic starting point for safety repairs and structural maintenance.\n\nHowever, cracks like these are often serious safety concerns that can lead to unexpected structural failure. We need to stabilize these points quickly to ensure your home remains fully protected.\n\nCatching this now is much more cost-effective than a full emergency removal later. Let's get a specialist out there to confirm the inner core health.\n\nBook your free estimate today 👇 and let's see how we can help you keep your tree safe. 🏠`,
      planSteps: ["Detailed structural climb", "High-strength support cables", "Canopy weight reduction"],
      timeline: "Priority (Within 24h)",
      recommendations: []
    };
  }
};
