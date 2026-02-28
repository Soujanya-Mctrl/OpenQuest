/**
 * apps/api/src/ai/geminiClient.ts
 *
 * Reusable Gemini API client for the AI personalization layer.
 * Separate from the RAG pipeline's Gemini usage in ragQuery.route.ts.
 */

export interface GeminiMessage {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxOutputTokens?: number;
}

export async function callGeminiAI(options: GeminiMessage): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: options.systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
            generationConfig: {
                temperature: options.temperature ?? 0.7,
                maxOutputTokens: options.maxOutputTokens ?? 2048,
                responseMimeType: "application/json",
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini AI error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as {
        candidates: Array<{
            content: { parts: Array<{ text: string }> };
        }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}
