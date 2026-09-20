import { NextRequest, NextResponse } from "next/server";

// Year-in-review marketing OG image, not used in this fork's demo. Disabled
// rather than fixed: it pulled two full font files into the edge bundle,
// pushing it to 1.08 MB against Vercel's 1 MB edge-function cap on Hobby.
export async function GET(_req: NextRequest) {
  return new NextResponse("Not found", { status: 404 });
}
