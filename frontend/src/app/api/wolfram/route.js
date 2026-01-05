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

// POST — запрос в Wolfram (JSON v2/query) + парсинг ответа
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body?.query;

    if (!query || !String(query).trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    // ВАЖНО: переменная должна называться именно WOLFRAM_APP_ID
    const appid = process.env.WOLFRAM_APP_ID;
    if (!appid) {
      return NextResponse.json({ error: "Wolfram AppID not configured" }, { status: 500 });
    }

    const url =
      "https://api.wolframalpha.com/v2/query?" +
      "appid=" +
      encodeURIComponent(appid) +
      "&input=" +
      encodeURIComponent(String(query)) +
      "&output=json" +
      "&format=plaintext";

    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Wolfram error: ${res.status}`, details: t },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Достаём plaintext из pod "Roots" (или любого pod где есть root)
    const pods = data?.queryresult?.pods || [];
    const rootsPod = pods.find(
      (p) =>
        p?.id === "Roots" ||
        String(p?.title || "").toLowerCase().includes("root") ||
        String(p?.title || "").toLowerCase().includes("корн") ||
        String(p?.title || "").toLowerCase().includes("решен")
    );

    const rootsText = rootsPod?.subpods?.[0]?.plaintext || null;

    return NextResponse.json({
      ok: true,
      roots: rootsText, // например: "2, 3"
      data,             // оставляем пока для отладки
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
