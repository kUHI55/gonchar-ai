import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ✅ Анти-спам: 1 запрос / 3 сек (очень простая защита денег)
let lastRequestTime = 0;

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

export async function POST(req) {
  try {
    // ✅ Лимит запросов
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

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ✅ Жёстко фиксируем модель, чтобы не улететь на дорогую
    const model = "gpt-4.1-mini";

    const prompt = `
Ты — школьный AI-репетитор по математике.
Сгенерируй урок для ребенка по теме: "${topic}".

Верни СТРОГО JSON (без текста вокруг). Никаких комментариев, только JSON.

Формат:
{
  "title": "Тема: ...",
  "theory": "markdown текст объяснения",
  "tasks": [
    { "id": "t1", "title": "Задача 1", "prompt": "..." },
    { "id": "t2", "title": "Задача 2", "prompt": "..." },
    { "id": "t3", "title": "Задача 3", "prompt": "..." }
  ]
}
`.trim();

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are a helpful tutor. Return ONLY valid JSON. No prose. No code fences.",
        },
        { role: "user", content: prompt },
      ],
      max_output_tokens: 1200,
    });

    const text = response.output_text?.trim() || "";

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    // ✅ обработка VPN/региона
    if (isRegionBlock(err)) {
      return NextResponse.json(
        {
          code: "REGION_BLOCK",
          error:
            "OpenAI API недоступен из-за VPN/региона. Выключи VPN и попробуй ещё раз. Пока можно работать в демо-режиме.",
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
