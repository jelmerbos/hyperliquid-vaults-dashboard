import { NextResponse } from "next/server";
import { fetchVaultList } from "@/lib/api/client";

export async function GET() {
  try {
    const vaults = await fetchVaultList();
    return NextResponse.json(vaults);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
