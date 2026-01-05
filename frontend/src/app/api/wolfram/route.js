import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — быстрый тест
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/wolfram",
    methods: ["GET", "POST"],
  });
}

function extractRootsFromWolfram(data) {
  // Wolfram JSON: data.queryresult.pods[].subpods[].plaintext
  const pods = data?.queryresult?.pods || [];

  const texts = [];
  for (const p of pods) {
    const subs = p?.subpods || [];
    for (const s of subs) {
      const t = (s?.plaintext || "").trim();
      if (t) texts.push(t);
    }
  }

  // 1) Пробуем найти pod "Solution" / "Solutions" / "Roots"
  // Т.к. мы уже собрали plaintext, просто ищем по содержимому
  const joined = texts.join("\n");

  // Частые форматы:
  // "x = 2, 3"
  // "x = 2 or x = 3"
  // "x = 2; x = 3"
  // "2, 3"
  // "x = 2\nx = 3"
  let s = joined;

  // Убираем мусор
  s = s.replace(/\r/g, "");
  s = s.replace(/±/g, "+/-");

  // Пытаемся вытащить числа после "x ="
  const afterXeq = [];
  const reX = /x\s*=\s*([-+]?\d+(\.\d+)?)/gi;
  let m;
  while ((m = reX.exec(s)) !== null) {
    afterXeq.push(Number(m[1]));
  }
  if (afterXeq.length) return [...new Set(afterXeq)];

  // Если не нашли "x =", пробуем просто список чисел "2, 3" в строке с "root/solution"
  const lines = s.split("\n");
  const candidateLines = lines.filter((line) =>
    /root|solution|solve|result|answer/i.test(line)
  );

  const pool = (candidateLines.length ? candidateLines : lines).join(" ");

  const nums = [];
  const reNum = /([-+]?\d+(\.\d+)?)/g;
  while ((m = reNum.exec(pool)) !== null) {
    nums.push(Number(m[1]));
  }

  // Если чисел мало и они похожи на ответ — вернем
  const uniq = [...new Set(nums)];
  if (uniq.length >= 1 && uniq.length <= 6) return uniq;

  return null;
}

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query || !String(query).trim()) {
      return NextResponse.json({ error: "query required" }, { status: 400 });
    }

    const appid = process.env.WOLFRAM_APP_ID;
    if (!appid) {
      return NextResponse.json({ error: "No WOLFRAM_APP_ID" }, { status: 500 });
    }

    // v2/query + output=json — чтобы можно было парсить
    const url =
      "https://api.wolframalpha.com/v2/query?" +
      "appid=" +
      encodeURIComponent(appid) +
      "&input=" +
      encodeURIComponent(query) +
      "&output=json";

    const res = await fetch(url);
    const data = await res.json();

    const roots = extractRootsFromWolfram(data);

    return NextResponse.json({ ok: true, roots, data });
  } catch (e) {
    return NextResponse.json(
      { error: String(e?.message || e || "Server error") },
      { status: 500 }
    );
  }
}
