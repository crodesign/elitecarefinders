import { geminiModel } from './vertex';

export type AiSeoInput = {
    contentType: 'home' | 'facility' | 'post';
    title: string;
    body: string;
    primaryKeyword?: string;
    location?: string;
    careTypes?: string[];
};

export type AiSeoOutput = {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    primaryKeyword?: string;
    faqs?: { question: string; answer: string }[];
};

const SYSTEM_PROMPT = `You are an SEO specialist for EliteCareFinders, a senior-care placement website that helps families find adult foster homes and senior care facilities in Hawaii. Your job is to write accurate, natural-language SEO metadata for listings and articles.

Rules:
- Never invent facts. Only rephrase or summarise the provided content.
- No keyword stuffing or clickbait headlines.
- Write for someone actively searching for care placement — use intent-focused language ("find", "trusted", "RN-guided", "compare", "near").
- Always include the Hawaii island name (Oahu, Maui, Kauai, Big Island) and neighbourhood when location data is provided. Derive the island from the city if possible (e.g. Honolulu, Kailua, Pearl City → Oahu; Kahului, Lahaina → Maui; Lihue, Kapaa → Kauai; Hilo, Kona → Big Island).
- Meta titles: EXACTLY 50–60 characters. Count every character including spaces. If under 50, add location or care type detail. If over 60, cut a word.
- Meta descriptions: EXACTLY 140–160 characters. Count every character including spaces and punctuation before writing the JSON value. Build to 140+ by covering: (1) what makes this listing unique, (2) location, (3) a direct call to action. If you reach 160, stop at the nearest word boundary. Do not output a description shorter than 140 characters.
- OG title/description: written for social sharing, NOT identical to meta equivalents. Meta targets Google crawlers; OG targets social sharers scrolling a feed. OG should be warmer and more conversational. Same length rules apply.
- Output ONLY valid JSON. No markdown, no code fences, no explanation.`;

function buildUserPrompt(input: AiSeoInput): string {
    const typeLabel =
        input.contentType === 'post' ? 'blog article' :
        input.contentType === 'facility' ? 'senior care facility' :
        'adult foster home';

    const includeFaqs = input.contentType !== 'post';
    const careTypeStr = input.careTypes && input.careTypes.length > 0
        ? input.careTypes.join(', ')
        : null;

    return `Generate SEO metadata for this ${typeLabel} on EliteCareFinders.com.

Title: ${input.title}${input.location ? `\nLocation: ${input.location}` : ''}${careTypeStr ? `\nCare types offered: ${careTypeStr}` : ''}${input.primaryKeyword ? `\nPrimary keyword: ${input.primaryKeyword}` : ''}

Content:
${input.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)}

Return a JSON object with exactly these fields:
{
  "metaTitle": "50–60 chars, Google-optimised, includes island/neighbourhood and care type if natural",
  "metaDescription": "HARD REQUIREMENT: 140–160 characters exactly. Verify your character count. Cover what makes the listing special, the location, and a call to action.",
  "ogTitle": "Social-optimised title — different wording from metaTitle, warmer and conversational (50–60 chars)",
  "ogDescription": "HARD REQUIREMENT: 140–160 characters exactly. Different wording from metaDescription — warmer, written for someone scrolling a social feed.",
  "primaryKeyword": "The single most targeted search phrase for this listing (e.g. 'adult foster homes Oahu' or 'memory care Maui')",
  "faqs": ${includeFaqs
        ? '[{"question":"...","answer":"..."}] — 3 to 5 questions a prospective resident or family member might ask about this listing'
        : '[]'}
}`;
}

function sanitize(s: unknown, maxLen: number): string {
    if (typeof s !== 'string') return '';
    return s.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

// Trim a description to maxLen at a word boundary, appending ellipsis if trimmed
function trimDescription(s: string, maxLen = 160): string {
    s = s.trim().replace(/\s+/g, ' ');
    if (s.length <= maxLen) return s;
    const cut = s.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > maxLen - 20 ? cut.slice(0, lastSpace) : cut) + '…';
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
        metaDescription: trimDescription(sanitize(parsed.metaDescription, 320)),
        ogTitle: sanitize(parsed.ogTitle, 120),
        ogDescription: trimDescription(sanitize(parsed.ogDescription, 320)),
        primaryKeyword: parsed.primaryKeyword ? sanitize(parsed.primaryKeyword, 120) : undefined,
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
