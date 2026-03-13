import { geminiModel } from './vertex';

export type AiSeoInput = {
    contentType: 'home' | 'facility' | 'post';
    title: string;
    body: string;
    primaryKeyword?: string;
    location?: string;
};

export type AiSeoOutput = {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    faqs?: { question: string; answer: string }[];
};

const SYSTEM_PROMPT = `You are an SEO specialist for EliteCareFinders, a senior-care placement website that helps families find adult foster homes and senior care facilities. Your job is to write accurate, natural-language SEO metadata for listings and articles.

Rules:
- Never invent facts. Only rephrase or summarise the provided content.
- No keyword stuffing or clickbait headlines.
- Write conversationally — helpful human tone, not robotic.
- Meta titles: ~50–60 characters, include location or keyword where natural.
- Meta descriptions: 140–160 characters, describe the page value clearly.
- OG title/description: similar in meaning to meta equivalents but not identical word-for-word.
- Output ONLY valid JSON. No markdown, no code fences, no explanation.`;

function buildUserPrompt(input: AiSeoInput): string {
    const typeLabel =
        input.contentType === 'post' ? 'blog article' :
        input.contentType === 'facility' ? 'senior care facility' :
        'adult foster home';

    const includeFaqs = input.contentType !== 'post';

    return `Generate SEO metadata for this ${typeLabel} on EliteCareFinders.com.

Title: ${input.title}${input.location ? `\nLocation: ${input.location}` : ''}${input.primaryKeyword ? `\nPrimary keyword: ${input.primaryKeyword}` : ''}

Content:
${input.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)}

Return a JSON object with exactly these fields:
{
  "metaTitle": "50–60 chars, includes location/keyword if natural, no clickbait",
  "metaDescription": "140–160 chars, natural language, summarises the page value",
  "ogTitle": "Similar meaning to metaTitle but different wording (50–60 chars)",
  "ogDescription": "Similar meaning to metaDescription but not identical (140–160 chars)",
  "faqs": ${includeFaqs
        ? '[{"question":"...","answer":"..."}] — 3 to 5 questions a prospective resident or family member might ask about this listing'
        : '[]'}
}`;
}

function sanitize(s: unknown, maxLen: number): string {
    if (typeof s !== 'string') return '';
    return s.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

function fallback(input: AiSeoInput): AiSeoOutput {
    const plain = input.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = plain.slice(0, 157) + (plain.length > 157 ? '…' : '');
    return {
        metaTitle: input.title.slice(0, 60),
        metaDescription: desc,
        ogTitle: input.title.slice(0, 60),
        ogDescription: desc,
        faqs: [],
    };
}

export async function generateSeoWithGemini(input: AiSeoInput): Promise<AiSeoOutput> {
    const model = geminiModel();

    const result = await model.generateContent({
        systemInstruction: SYSTEM_PROMPT,
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }] }],
    });

    const text = result.response.text() ?? '';

    let parsed: AiSeoOutput;
    try {
        parsed = JSON.parse(text);
    } catch {
        console.error('[ai-seo] JSON parse failed, using fallback. Raw:', text.slice(0, 300));
        return fallback(input);
    }

    return {
        metaTitle: sanitize(parsed.metaTitle, 120),
        metaDescription: sanitize(parsed.metaDescription, 320),
        ogTitle: sanitize(parsed.ogTitle, 120),
        ogDescription: sanitize(parsed.ogDescription, 320),
        faqs: Array.isArray(parsed.faqs)
            ? parsed.faqs
                .slice(0, 5)
                .map(f => ({
                    question: sanitize(f?.question, 200),
                    answer: sanitize(f?.answer, 500),
                }))
                .filter(f => f.question && f.answer)
            : [],
    };
}
