import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  MEMO_SYSTEM_PROMPT,
  buildVaultContext,
} from "@/lib/ai/prompts";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  DDMemo,
} from "@/lib/ai/types";

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export async function POST(request: NextRequest) {
  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "AI features unavailable: ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.mode || !body.vaultName || !body.metrics) {
    return NextResponse.json(
      { error: "Missing required fields: mode, vaultName, metrics" },
      { status: 400 },
    );
  }

  const vaultContext = buildVaultContext(body);

  try {
    if (body.mode === "classify") {
      return await handleClassify(client, vaultContext);
    } else if (body.mode === "memo") {
      return await handleMemo(client, vaultContext, body.vaultName);
    } else {
      return NextResponse.json(
        { error: "Invalid mode. Use 'classify' or 'memo'" },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AI rate limit reached. Try again in a moment." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY" },
        { status: 401 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return NextResponse.json(
        { error: "AI service error. Try again later." },
        { status: 502 },
      );
    }
    throw error;
  }
}

async function handleClassify(
  client: Anthropic,
  vaultContext: string,
): Promise<NextResponse> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: CLASSIFICATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this vault and return a JSON object with exactly this structure:

{
  "classification": {
    "primaryStrategy": "<strategy category>",
    "secondaryStrategies": ["<category>", ...],
    "confidence": <0-1>,
    "reasoning": "<explanation>"
  },
  "score": {
    "overall": <1-10>,
    "riskManagement": <1-10>,
    "returnQuality": <1-10>,
    "consistency": <1-10>,
    "transparency": <1-10>,
    "summary": "<brief assessment>"
  }
}

Vault data:
${vaultContext}

Respond only with the JSON object, no other text.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json(
      { error: "No text response from AI" },
      { status: 502 },
    );
  }

  const parsed: AnalyzeResponse = JSON.parse(textBlock.text);
  return NextResponse.json(parsed);
}

async function handleMemo(
  client: Anthropic,
  vaultContext: string,
  vaultName: string,
): Promise<NextResponse> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: MEMO_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Write a due diligence memo for this vault. Return a JSON object with exactly this structure:

{
  "title": "DD Memo: <vault name>",
  "date": "${new Date().toISOString().split("T")[0]}",
  "sections": {
    "strategyOverview": "<strategy description>",
    "riskAssessment": "<risk analysis>",
    "edgeHypothesis": "<edge hypothesis>",
    "concerns": ["<concern 1>", "<concern 2>", ...],
    "capacityAnalysis": "<capacity analysis>",
    "recommendation": "<recommendation>"
  }
}

Vault data:
${vaultContext}

Respond only with the JSON object, no other text.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json(
      { error: "No text response from AI" },
      { status: 502 },
    );
  }

  const parsed: DDMemo = JSON.parse(textBlock.text);
  return NextResponse.json(parsed);
}
