
import { GoogleGenAI, Type } from "@google/genai";
import { QuizAnswers, AssessmentResult } from "../types";

/**
 * Maps IDs to readable labels for the dynamic fallback engine
 */
const labelMap: Record<string, string> = {
  'front-yard': 'front yard',
  'back-yard': 'backyard',
  'near-structure': 'near-structure',
  'near-lines': 'near power lines',
  'healthy': 'healthy appearance',
  'weak-branches': 'weak-looking branches',
  'unstable': 'unstable stance',
  'storm-damaged': 'storm-damaged',
  'none': 'no visible cracking',
  'minor': 'minor hairline cracks',
  'major': 'significant structural decay',
  'unsure': 'unknown structural status',
  'young': 'young tree',
  'mature': 'established mature tree',
  'old': 'heritage-age tree'
};

export const getTreeAssessment = async (answers: QuizAnswers, userName: string): Promise<AssessmentResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    You are Tom Edwards, an expert arborist.
    Analyze this data for ${userName}:
    - Location: ${answers.location}
    - Condition: ${answers.condition}
    - Storms: ${answers.storms}
    - Cracks: ${answers.cracks}
    - Maturity: ${answers.age}
    - Concerns: ${answers.concerns || 'None'}

    Rules for your response summary text:
    - Use exactly 4-5 short, high-value paragraphs.
    - Max 3-4 lines per paragraph.
    - Use EXACTLY 3 relevant emojis total in the entire text.
    - Be conversational, friendly, and expert.
    - Focus on preserving the tree and property safety.
    - Do not use lists; only use paragraphs.

    Return a JSON object:
    {
      "riskLevel": number (0-100),
      "status": "Low"|"Moderate"|"High"|"Critical",
      "statusLabel": string,
      "summary": string,
      "planSteps": string[],
      "timeline": string
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
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

    const data = JSON.parse(response.text || '{}');
    if (!data.riskLevel) throw new Error("Invalid response");
    return { ...data, recommendations: [] } as AssessmentResult;

  } catch (error) {
    console.warn("AI Offline: Using Local Logic Engine for Personalized Report.");
    
    let risk = 25;
    if (answers.condition === 'storm-damaged' || answers.condition === 'unstable') risk += 30;
    if (answers.cracks === 'major') risk += 20;
    if (answers.location === 'near-structure' || answers.location === 'near-lines') risk += 10;
    if (answers.storms === 'yes') risk += 10;
    risk = Math.min(risk, 98);

    const status = risk > 75 ? 'Critical' : risk > 45 ? 'High' : risk > 25 ? 'Moderate' : 'Low';
    const locLabel = labelMap[answers.location] || 'tree';
    const condLabel = labelMap[answers.condition] || 'current state';

    const summary = [
      `Hi ${userName}! Thanks for letting me review your ${locLabel} tree. Based on your inputs, I've conducted a primary structural analysis.`,
      
      `While the tree shows signs of maturity, the ${condLabel} condition suggests we need a closer look at the core to ensure long-term stability. 🌲`,
      
      `In my experience, structural patterns like these can lead to decay if not addressed before the next storm season arrives. 🛡️`,
      
      `Preservation is usually possible with simple cabling or weight-reduction. Let's keep your home safe while keeping the tree. 🏠`,
      
      `My team is standing by to verify these findings in person. It's the smartest move for your property's value and safety.`
    ].join('\n\n');

    return {
      riskLevel: risk,
      status: status as any,
      statusLabel: risk > 40 ? 'ANALYSIS REQUIRED' : 'STABLE STATUS',
      summary: summary,
      planSteps: [
        "Internal sonic tomography",
        "Structural crown reduction",
        "Rootzone health injection"
      ],
      timeline: risk > 60 ? "Priority Schedule (72h)" : "Schedule within 14 Days",
      recommendations: []
    };
  }
};
