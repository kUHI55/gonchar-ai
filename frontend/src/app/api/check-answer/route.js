import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// анти-спам: 1 запрос / 2 сек
let lastTime = 0;

async function wolframResult(query) {
  const appid = process.env.WOLFRAM_APPID;
  if (!appid) throw new Error("WOLFRAM_APPID missing in .env.local");

  const url =
    "https://api.wolframalpha.com/v1/result" +
    `?appid=${encodeURIComponent(appid)}` +
    `&i=${encodeURIComponent(query)}`;

  const r = await fetch(url);
  const text = await r.text();
  return { ok: r.ok, text };
}

export async function POST(req) {
  try {
    const now = Date.now();
    if (now - lastTime < 2000) {
      return NextResponse.json(
        { error: "Подожди 2 секунды перед следующей проверкой 🙂" },
        { status: 429 }
      );
    }
    lastTime = now;

    const { topic, theory, task, answerText } = await req.json();

    if (!answerText || !answerText.trim()) {
      return NextResponse.json({ error: "answerText is required" }, { status: 400 });
    }
    if (!task?.prompt) {
      return NextResponse.json({ error: "task.prompt is required" }, { status: 400 });
    }

    // 1) Эталон: Wolfram
    const wolframQuery =
      (task?.wolframQuery || "").trim() ||
      `solve ${task.prompt}`; // fallback

    const w = await wolframResult(wolframQuery);

    // 2) GPT объясняет как учитель, сверяя с Wolfram
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const system = `
Ты — лучший школьный учитель математики (10–16 лет).
Проверяй решение ученика и учи.

Правила:
- Если неверно: НЕ давай финальный ответ. Скажи "ошибка на шаге X" (если можно) и задай 1–2 наводящих вопроса.
- Если верно: похвали и предложи маленькое усложнение.
- Если непонятно: задай 1 уточняющий вопрос.
Коротко, по пунктам, простыми словами.
`.trim();

    const user = `
ТЕМА: ${topic || "математика"}

ТЕОРИЯ:
${theory || "(нет)"}

ЗАДАЧА:
${task.title || "Задача"} — ${task.prompt}

WOLFRAM QUERY:
${wolframQuery}

WOLFRAM RESULT (эталон):
${w.ok ? w.text : "(Wolfram не дал нормальный ответ: " + w.text + ")"}

РЕШЕНИЕ УЧЕНИКА:
${answerText}

Проверь и объясни как учитель.
`.trim();

    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens: 700,
    });

    const feedback =
      resp.output_text?.trim() ||
      "Не смог проверить. Попробуй написать решение чуть подробнее.";

    return NextResponse.json({
      ok: true,
      wolframOk: w.ok,
      wolframAnswer: w.text,
      feedback,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
