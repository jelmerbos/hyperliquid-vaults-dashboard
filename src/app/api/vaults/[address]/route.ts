import { NextResponse } from "next/server";
import { fetchVaultDetails } from "@/lib/api/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid vault address" }, { status: 400 });
    }
    const details = await fetchVaultDetails(address);
    return NextResponse.json(details);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
