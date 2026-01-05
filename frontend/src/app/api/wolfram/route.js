import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — быстрый тест: открой /api/wolfram в браузере и увидишь JSON
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/wolfram",
    methods: ["GET", "POST"],
  });
}

// POST — запрос в Wolfram
export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query || !String(query).trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    // ВАЖНО: в Vercel/ .env должно называться именно так:
    const appid = process.env.WOLFRAM_APP_ID;
    if (!appid) {
      return NextResponse.json({ error: "No WOLFRAM_APP_ID" }, { status: 500 });
    }

    // Простой endpoint (v1/result) возвращает текстовый ответ
    const url =
      "https://api.wolframalpha.com/v1/result?appid=" +
      encodeURIComponent(appid) +
      "&i=" +
      encodeURIComponent(query);

    const r = await fetch(url);
    const text = await r.text();

    return NextResponse.json({ ok: true, result: text });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
