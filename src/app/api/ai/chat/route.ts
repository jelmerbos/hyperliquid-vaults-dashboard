import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  vaultContext: string;
}

export async function POST(request: NextRequest) {
  const client = getClient();
  if (!client) {
    return new Response(
      JSON.stringify({ error: "AI features unavailable: ANTHROPIC_API_KEY not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Missing required field: messages" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = body.vaultContext
    ? `${CHAT_SYSTEM_PROMPT}\n\n## Vault Context\n${body.vaultContext}`
    : CHAT_SYSTEM_PROMPT;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const message =
            error instanceof Anthropic.APIError
              ? `AI error: ${error.message}`
              : "Unexpected error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return new Response(
        JSON.stringify({ error: "AI rate limit reached. Try again in a moment." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return new Response(
        JSON.stringify({ error: "Invalid ANTHROPIC_API_KEY" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    throw error;
  }
}
