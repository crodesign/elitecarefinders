import { NextResponse } from 'next/server';
import { chatModel } from '@/lib/vertex';

const SYSTEM_PROMPT = `You are the Elite CareFinders virtual assistant — a warm, knowledgeable guide helping families and individuals find the right senior living community in Hawaii and beyond.

Elite CareFinders specializes in:
- Adult Foster Homes (small, residential, 1–5 residents, home-like setting)
- Assisted Living Facilities (larger, professional staff, more services)
- Memory Care Homes (specialized for Alzheimer's and dementia)
- Independent Living Communities

Your role:
- Help visitors understand their senior care options
- Answer questions about care types, costs, amenities, and what to look for
- Guide them toward scheduling a free consultation with an Elite CareFinders advisor
- Be empathetic — families are often under stress when seeking care for a loved one

Tone: warm, professional, concise. Keep responses to 2–4 sentences unless more detail is genuinely needed.

Do NOT:
- Make up specific pricing (say "pricing varies — an advisor can give you accurate estimates")
- Promise specific availability
- Provide medical advice

If someone seems ready to move forward, encourage them to schedule a free consultation — it's at no cost and no obligation.`;

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(request: Request) {
    try {
        const { messages, userContext }: {
            messages: ChatMessage[];
            userContext?: { name?: string; email?: string };
        } = await request.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
        }

        const model = chatModel();

        // Build system prompt — personalize if user is logged in
        let systemText = SYSTEM_PROMPT;
        if (userContext?.name) {
            systemText += `\n\nThe user is logged in as ${userContext.name}${userContext.email ? ` (${userContext.email})` : ''}. Address them by first name when appropriate.`;
        }

        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const result = await model.generateContentStream({
            systemInstruction: systemText,
            contents,
        });

        // Stream the response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (err: any) {
        console.error('[Chat API] Error:', err);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
