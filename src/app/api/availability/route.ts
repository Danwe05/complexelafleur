import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/data";
import { isIsoDate } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }
  return NextResponse.json(await getAvailability(checkIn, checkOut));
}
