import { GoogleGenerativeAI } from '@google/generative-ai';

function getGenAI() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    return new GoogleGenerativeAI(key);
}

export function geminiModel(modelName = 'gemini-2.5-flash') {
    return getGenAI().getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });
}

export function chatModel(modelName = 'gemini-2.5-flash') {
    return getGenAI().getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'text/plain',
            maxOutputTokens: 1024,
            temperature: 0.7,
        },
    });
}
