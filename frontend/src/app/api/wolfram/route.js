import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — чтобы проверить, что роут вообще существует на Vercel
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/wolfram",
    methods: ["GET", "POST"],
  });
}

// POST — твой Wolfram запрос
export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const appid = process.env.WOLFRAM_APP_ID;
    if (!appid) {
      return NextResponse.json({ error: "No WOLFRAM_APP_ID" }, { status: 500 });
    }

    const url =
      "https://api.wolframalpha.com/v1/result?appid=" +
      encodeURIComponent(appid) +
      "&i=" +
      encodeURIComponent(query);

    const r = await fetch(url);
    const text = await r.text();

    return NextResponse.json({ ok: true, result: text });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
