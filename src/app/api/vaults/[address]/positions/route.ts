import { NextResponse } from "next/server";
import {
  fetchClearinghouseState,
  fetchSpotClearinghouseState,
} from "@/lib/api/client";
import type { VaultPositions } from "@/lib/api/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid vault address" },
        { status: 400 },
      );
    }

    const [perp, spot] = await Promise.all([
      fetchClearinghouseState(address),
      fetchSpotClearinghouseState(address),
    ]);

    const positions: VaultPositions = { perp, spot };
    return NextResponse.json(positions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
