import { GoogleGenAI } from '@google/genai';

export async function askGemini(
  apiKey: string,
  promptText: string,
  imageBase64?: string | null,
  audioBlob?: Blob | null
) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    const contents: any[] = [{ text: promptText }];

    // If an image was taken
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      });
    }

    // If audio was recorded
    if (audioBlob && audioBlob.size > 0) {
      const audioBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(audioBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      contents.push({
        inlineData: {
          data: base64Audio,
          mimeType: audioBlob.type || 'audio/webm'
        }
      });
    }

    const response = await ai.models.generateContent({
      model,
      contents,
    });

    return response.text;
  } catch (err) {
    console.error('Gemini API Error:', err);
    return 'Error communicating with AI Assistant.';
  }
}

export async function evaluateInterview(apiKey: string, history: string[]) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    const promptText = `
You are evaluating a candidate after a pair-programming interview. 
Based on the following history of hints and code summaries:
${history.map((h, i) => `Step ${i + 1}: ${h}`).join('\n')}

Provide an evaluation in JSON format exactly like this:
{
  "score": 85,
  "signal": "Strong Hire" | "Weak Hire" | "No Hire",
  "justification": "A brief 2-sentence explanation of why."
}
Do not use markdown blocks, output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ text: promptText }],
    });

    const text = response.text || '{}';
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Evaluation Error:', err);
    return {
      score: 0,
      signal: 'No Hire',
      justification: 'Error evaluating the interview.',
    };
  }
}
