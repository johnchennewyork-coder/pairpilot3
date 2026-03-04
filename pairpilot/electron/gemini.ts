import { GoogleGenAI } from '@google/genai';

export async function askGemini(
  apiKey: string,
  promptText: string,
  imageBase64: string | null,
  audioBase64: string | null,
  audioMime: string | null
) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // According to docs: `ai.models.generateContent`
    const contents: any[] = [promptText];

    if (imageBase64 && imageBase64.length > 100) {
      // Strip data URL prefix if present and remove any non-base64 characters (newlines, spaces)
      const raw = imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
      if (raw.length > 0) {
        contents.push({
          inlineData: {
            data: raw,
            mimeType: imageBase64.includes('image/jpeg') ? 'image/jpeg' : 'image/png'
          }
        });
      }
    }

    if (audioBase64 && audioMime) {
      contents.push({
        inlineData: {
          data: audioBase64,
          mimeType: audioMime
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    return response.text;
  } catch (err) {
    console.error('Gemini API Error:', err);
    throw err;
  }
}

export async function evaluateInterview(apiKey: string, history: string[]) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const promptText = `
You are evaluating a candidate after a pair-programming interview. 
Based on the following history of hints and code summaries:
${history.map((h, i) => `Step ${i + 1}: ${h}`).join('\n')}

Provide an evaluation in JSON format exactly like this:
{
  "score": 85,
  "signal": "Strong Hire" | "Weak Hire" | "No Hire",
  "summary": "A 3-5 sentence overall summary of the candidate's journey from start to finish. Mentioning what they struggled with and where they excelled.",
  "justification": "A brief 2-sentence explanation of the signal."
}
Do not use markdown blocks, output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
    });

    const text = response.text || '{}';
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Evaluation Error:', err);
    throw err;
  }
}
