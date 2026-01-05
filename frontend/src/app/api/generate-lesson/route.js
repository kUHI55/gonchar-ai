import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ✅ Анти-спам: 1 запрос / 3 сек
let lastRequestTime = 0;

function isRegionBlock(err) {
  const status = err?.status || err?.response?.status;
  const msg = String(err?.message || "");

  return (
    status === 403 ||
    msg.includes("Country, region, or territory not supported") ||
    msg.toLowerCase().includes("region") ||
    msg.toLowerCase().includes("territory")
  );
}

// ✅ если модель вдруг вернула не “чистый JSON”, вырежем объект {...}
function extractJsonObject(text) {
  const s = String(text || "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return s.slice(first, last + 1);
}

export async function POST(req) {
  try {
    const now = Date.now();
    if (now - lastRequestTime < 3000) {
      return NextResponse.json(
        { error: "Подожди 3 секунды перед следующим запросом 🙂" },
        { status: 429 }
      );
    }
    lastRequestTime = now;

    const { topic } = await req.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ фиксируем модель (чтобы не улететь в дорогую)
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const system = `
Ты — школьный AI-репетитор по математике для ученика 10–16 лет.

Верни ТОЛЬКО валидный JSON. Никакого текста вокруг. Никаких code fences.

ВАЖНО ПРО ФОРМУЛЫ:
- НЕ используй LaTeX: никаких $...$, $$...$$, \\frac, \\sqrt и т.п.
- Формулы пиши обычным текстом: "x^2 - 5x + 6 = 0", "D = b^2 - 4ac", "x = (-b ± sqrt(D)) / (2a)".
`.trim();

    const user = `
Сгенерируй урок для ребёнка по теме: "${topic}".

Верни СТРОГО JSON в формате:

{
  "title": "Тема: ...",
  "theory": "markdown-текст (без LaTeX)",
  "tasks": [
    { "id": "t1", "title": "Задача 1", "prompt": "..." },
    { "id": "t2", "title": "Задача 2", "prompt": "..." },
    { "id": "t3", "title": "Задача 3", "prompt": "..." }
  ]
}

Правила к задачам:
- 3 задачи, от простой к сложнее
- формулировки короткие и понятные
- без LaTeX
`.trim();

    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens: 1200,
    });

    const raw = response.output_text?.trim() || "";

    // 1) пробуем парсить как есть
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // 2) если не вышло — вырезаем JSON-объект и парсим его
      const cut = extractJsonObject(raw);
      if (!cut) {
        return NextResponse.json(
          { error: "Model returned invalid JSON", raw },
          { status: 500 }
        );
      }
      try {
        data = JSON.parse(cut);
      } catch {
        return NextResponse.json(
          { error: "Model returned invalid JSON", raw },
          { status: 500 }
        );
      }
    }

    // минимальная валидация
    if (!data?.title || !data?.theory || !Array.isArray(data?.tasks)) {
      return NextResponse.json(
        { error: "JSON schema mismatch", raw, parsed: data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    if (isRegionBlock(err)) {
      return NextResponse.json(
        {
          code: "REGION_BLOCK",
          error:
            "OpenAI API недоступен из-за региона/VPN. На Vercel обычно работает. Если нет — посмотрим логи деплоя.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
