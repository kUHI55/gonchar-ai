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

    const body = await req.json().catch(() => ({}));
    const { topic, theory, task, answerText } = body;

    const a = String(answerText || "").trim();
    if (!a) {
      return NextResponse.json({ error: "answerText is required" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    // ВАЖНО: заставляем модель вернуть JSON с verdict
    const system = `
Ты — школьный учитель математики (10–16 лет). Ты проверяешь решение ученика.

Верни СТРОГО JSON без лишнего текста вокруг, формат:

{
  "verdict": "correct" | "incorrect" | "unclear",
  "feedback": "короткое объяснение простыми словами, по пунктам",
  "next": "1-2 коротких наводящих вопроса или следующий шаг (может быть пусто)"
}

Правила:
- verdict="correct": прямо скажи что верно.
- verdict="incorrect": прямо скажи что неверно (без финального ответа), укажи где ошибка + 1-2 вопроса.
- verdict="unclear": скажи что не хватает данных и задай 1 уточняющий вопрос.
- Не используй LaTeX ($$, \\frac и т.п.). Формулы — обычным текстом.
`.trim();

    const user = `
ТЕМА: ${topic || "математика"}

ТЕОРИЯ:
${theory || "(нет)"}

ЗАДАЧА:
${task ? `${task.title}\n${task.prompt}` : "(нет)"}

РЕШЕНИЕ УЧЕНИКА:
${a}
`.trim();

    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens: 700,
    });

    const raw = (resp.output_text || "").trim();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      // fallback если модель вдруг не вернула JSON
      data = {
        verdict: "unclear",
        feedback:
          "Я не смог корректно сформировать вердикт. Напиши решение чуть подробнее (с шагами).",
        next: "Какие шаги ты делал(а) и почему?",
      };
    }

    // защита: если verdict неправильный — приводим к safe
    const verdict = ["correct", "incorrect", "unclear"].includes(data?.verdict)
      ? data.verdict
      : "unclear";

    return NextResponse.json({
      ok: true,
      verdict,
      feedback: String(data?.feedback || "").trim(),
      next: String(data?.next || "").trim(),
    });
  } catch (err) {
    if (isRegionBlock(err)) {
      return NextResponse.json(
        {
          code: "REGION_BLOCK",
          error:
            "OpenAI API недоступен из-за региона/VPN. На Vercel обычно работает. Если нет — посмотрим логи.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
