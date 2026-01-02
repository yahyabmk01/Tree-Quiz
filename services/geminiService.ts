
import { GoogleGenAI, Type } from "@google/genai";
import { QuizAnswers, AssessmentResult } from "../types";

/**
 * Maps IDs to readable labels for the dynamic fallback engine
 */
const labelMap: Record<string, string> = {
  'front-yard': 'front yard',
  'back-yard': 'backyard',
  'near-structure': 'near your house',
  'near-lines': 'near power lines',
  'healthy': 'healthy appearance',
  'weak-branches': 'weak-looking branches',
  'unstable': 'unstable stance',
  'storm-damaged': 'storm-related damage',
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

    Return a JSON object:
    {
      "riskLevel": number (0-100),
      "status": "Low"|"Moderate"|"High"|"Critical",
      "statusLabel": string,
      "summary": string (5 paragraphs),
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
    
    // Calculate a dynamic risk level based on the answers
    let risk = 25;
    if (answers.condition === 'storm-damaged' || answers.condition === 'unstable') risk += 40;
    if (answers.cracks === 'major') risk += 25;
    if (answers.location === 'near-structure' || answers.location === 'near-lines') risk += 10;
    if (answers.storms === 'yes') risk += 10;
    risk = Math.min(risk, 98);

    const status = risk > 75 ? 'Critical' : risk > 45 ? 'High' : risk > 25 ? 'Moderate' : 'Low';
    const locLabel = labelMap[answers.location] || 'tree';
    const condLabel = labelMap[answers.condition] || 'current state';
    const crackLabel = labelMap[answers.cracks] || 'structural condition';

    // Build a 100% TAILORED summary even without AI
    const summary = [
      `Hi ${userName}! Thank you for providing the specific details about the tree in your ${locLabel}. Based on your input, I've conducted a preliminary structural analysis to identify any hidden hazards to your property.`,
      
      `Generally, an ${labelMap[answers.age] || 'established tree'} is a massive asset to your property value. It's great to hear that despite the ${condLabel}, the tree is still standing strong. Many homeowners underestimate the resilience of these species when given the right care.`,
      
      `However, the ${crackLabel} you mentioned, combined with its position ${locLabel}, does raise some specific safety flags. In my experience, these types of structural indicators can worsen rapidly during high winds, especially if the root plate has been compromised by recent moisture.`,
      
      `The good news is that "removal" isn't the only answer. Most people think a tree with ${condLabel} is a goner, but we can often stabilize it through professional crown thinning or weight reduction. This preservation approach is usually half the cost of a full removal and keeps your property's canopy intact.`,
      
      `Book your free estimate today 👇 and let's get a technician out to verify these findings in person. We'll make sure your home stays safe and your tree stays healthy. 🏠`
    ].join('\n\n');

    return {
      riskLevel: risk,
      status: status as any,
      statusLabel: `${status} Risk Identified`,
      summary: summary,
      planSteps: [
        "On-site sonic tomography test",
        "Targeted weight-reduction prune",
        "Soil aeration and root-health treatment"
      ],
      timeline: risk > 60 ? "Action Required: 48 Hours" : "Schedule within 7 Days",
      recommendations: []
    };
  }
};
