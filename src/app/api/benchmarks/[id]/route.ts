import { NextRequest, NextResponse } from "next/server";
import { fetchPrices } from "@/lib/benchmarks/coingecko";
import type { BenchmarkId } from "@/lib/benchmarks/types";

const VALID_IDS = new Set<string>(["BTC", "HYPE"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Benchmark data unavailable (no API key)" },
      { status: 503 },
    );
  }

  const { id } = await params;
  if (!VALID_IDS.has(id)) {
    return NextResponse.json(
      { error: `Invalid benchmark ID: ${id}. Must be BTC or HYPE.` },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const startMs = Number(searchParams.get("start"));
  const endMs = Number(searchParams.get("end"));

  if (!startMs || !endMs || startMs >= endMs) {
    return NextResponse.json(
      { error: "Invalid start/end parameters (unix ms required)" },
      { status: 400 },
    );
  }

  try {
    const prices = await fetchPrices(id as BenchmarkId, startMs, endMs, apiKey);
    return NextResponse.json({ prices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("rate limit") ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
