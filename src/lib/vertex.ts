import { VertexAI } from '@google-cloud/vertexai';

function getCredentials(): object {
    const encoded = process.env.GOOGLE_SERVICE_KEY;
    if (!encoded) throw new Error('GOOGLE_SERVICE_KEY environment variable is not set');
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json);
}

export function geminiModel(modelName = 'gemini-2.0-flash-001') {
    const vertex = new VertexAI({
        project: process.env.GCP_PROJECT_ID!,
        location: process.env.GCP_LOCATION ?? 'us-central1',
        googleAuthOptions: { credentials: getCredentials() },
    });
    return vertex.getGenerativeModel({
        model: modelName,
        generationConfig: {
            responseMimeType: 'application/json',
        },
    });
}
