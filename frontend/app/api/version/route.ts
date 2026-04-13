import { NextResponse } from "next/server";

const BUILD_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || String(Date.now());

export function GET() {
  return NextResponse.json(
    { version: BUILD_VERSION },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
