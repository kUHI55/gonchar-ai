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
      return NextResponse.json(
        { error: "answerText is required" },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    // =========================
    // 1️⃣ GPT-УЧИТЕЛЬ (объяснение)
    // =========================
    const systemTeacher = `
Ты — школьный учитель математики (10–16 лет).
Твоя задача — объяснить ученику, верно ли его решение.

Правила:
- НЕ пиши финальный ответ задачи.
- Если есть ошибка — укажи шаг и задай 1–2 наводящих вопроса.
- Если всё верно — коротко похвали.
- Пиши простым языком.
`.trim();

    const userTeacher = `
ТЕМА: ${topic || "математика"}

ТЕОРИЯ:
${theory || "(нет)"}

ЗАДАЧА:
${task ? `${task.title}\n${task.prompt}` : "(нет)"}

РЕШЕНИЕ УЧЕНИКА:
${a}
`.trim();

    const teacherResp = await client.responses.create({
      model,
      input: [
        { role: "system", content: systemTeacher },
        { role: "user", content: userTeacher },
      ],
      max_output_tokens: 500,
    });

    const feedback =
      teacherResp.output_text?.trim() ||
      "Я не смог корректно разобрать решение.";

    // =========================
    // 2️⃣ GPT-СУДЬЯ (жёсткий verdict)
    // =========================
    const systemJudge = `
Ты — строгий математический проверяющий.
Ответь СТРОГО одним словом: correct или incorrect.

Правила:
- Если решение математически верно — correct
- Даже если кратко, но логика верна — correct
- Если есть ошибка — incorrect
- Никаких объяснений
`.trim();

    const judgeResp = await client.responses.create({
      model,
      input: [
        { role: "system", content: systemJudge },
        {
          role: "user",
          content: `
ЗАДАЧА:
${task ? `${task.title}\n${task.prompt}` : "(нет)"}

РЕШЕНИЕ УЧЕНИКА:
${a}
`.trim(),
        },
      ],
      max_output_tokens: 10,
    });

    const hardVerdict =
      judgeResp.output_text?.trim() === "correct"
        ? "correct"
        : "incorrect";

    // =========================
    // ✅ ФИНАЛЬНЫЙ ОТВЕТ
    // =========================
    return NextResponse.json({
      ok: true,
      verdict: hardVerdict,
      feedback,
      next: hardVerdict === "incorrect"
        ? "Попробуй ещё раз, исправив указанный шаг."
        : "",
    });
  } catch (err) {
    if (isRegionBlock(err)) {
      return NextResponse.json(
        {
          code: "REGION_BLOCK",
          error:
            "OpenAI API недоступен из-за региона/VPN. На Vercel обычно работает.",
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
