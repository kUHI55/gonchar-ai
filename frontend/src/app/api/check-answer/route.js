import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// анти-спам: 1 запрос / 2 сек
let lastTime = 0;

function isRegionBlock(err) {
  const status = err?.status || err?.response?.status;
  const msg = String(err?.message || "");
  return (
    status === 403 ||
    msg.includes("Country, region, or territory not supported") ||
    msg.includes("region") ||
    msg.includes("territory")
  );
}

// helper: дергаем наш же /api/wolfram
async function solveWithWolfram(baseUrl, query) {
  const res = await fetch(`${baseUrl}/api/wolfram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (!res.ok || data?.error) {
    return { ok: false, error: data?.error || "Wolfram error", raw: data };
  }

  return { ok: true, roots: data?.roots ?? null, raw: data };
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
      return NextResponse.json(
        { error: "answerText is required" },
        { status: 400 }
      );
    }

    // baseUrl нужен, чтобы вызвать /api/wolfram на том же домене (Vercel/локал)
    const baseUrl =
      process.env.VERCEL_URL
        ? https://${process.env.VERCEL_URL}
        : "http://localhost:3000";

    // Формируем запрос к Wolfram на основе задачи
    // (пока простая версия: если есть текст задачи — передаём его в solve)
    // Позже улучшим: GPT будет генерить короткий wolfram-query из task.prompt.
    const wolframQuery = task?.prompt
      ? solve ${task.prompt}
      : solve ${answerText};

    const wolfram = await solveWithWolfram(baseUrl, wolframQuery);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const system = `
Ты — лучший школьный учитель математики (10–16 лет).
Твоя цель — проверить решение ученика и научить.

У тебя есть эталон от Wolfram (может быть roots или raw).
Правила:
1) Если решение неверное — НЕ говори сразу финальный ответ.
   Скажи, на каком шаге ошибка, и дай 1–2 наводящих вопроса.
2) Если верно — похвали коротко и предложи следующий шаг усложнения.
3) Если ученик написал мало/непонятно — задай 1 уточняющий вопрос.
4) Пиши коротко, простыми словами, по пунктам.
`.trim();

    const user = `
ТЕМА: ${topic || "математика"}

ТЕОРИЯ (может быть markdown):
${theory || "(нет)"}

ЗАДАЧА:
${task ? ${task.title}\n${task.prompt} : "(нет)"}

РЕШЕНИЕ УЧЕНИКА:
${answerText}

ЭТАЛОН от Wolfram:
ok: ${wolfram.ok}
roots: ${JSON.stringify(wolfram.roots)}
raw (сокращенно): ${wolfram.ok ? "есть" : JSON.stringify(wolfram.raw)}
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

    return NextResponse.json({ ok: true, feedback, wolfram: { ok: wolfram.ok, roots: wolfram.roots } });
  } catch (err) {
    if (isRegionBlock(err)) {
      return NextResponse.json(
        {
          code: "REGION_BLOCK",
          error:
            "OpenAI API недоступен из-за региона/VPN. На Vercel обычно работает. Если нет — скажи, посмотрим логи.",
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