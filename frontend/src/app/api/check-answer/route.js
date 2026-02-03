import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  getVisitorId,
  checkTextSpam,
  registerTextViolation,
} from "@/lib/antispam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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


function looksLikeMath(text) {
  return /[0-9x=+\-*/^()]/i.test(text);
}

export async function POST(req) {
  try {
    const visitorId = getVisitorId(req);

    
    const spam = await checkTextSpam(visitorId);
    if (spam.blocked) {
      return NextResponse.json(
        { error: spam.message },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { topic, theory, task, answerText } = body;

    const a = String(answerText || "").trim();
    if (!a) {
      return NextResponse.json(
        { error: "Напиши решение" },
        { status: 400 }
      );
    }

    
    if (!looksLikeMath(a)) {
      const data = await registerTextViolation(visitorId);

      if (data.bannedUntil) {
        return NextResponse.json(
          { error: "Доступ заблокирован" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Ответ не относится к математике" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    
    
    
    const systemTeacher = `
Ты — учитель математики.
Объясни, верно ли решение ученика.

Правила:
- НЕ пиши финальный ответ задачи
- Если ошибка — укажи шаг и задай 1–2 вопроса
- Если верно — прямо скажи, что решение верное
- Пиши простым языком
`.trim();

    const userTeacher = `
ТЕМА: ${topic || "математика"}

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

    
    
    
    const systemJudge = `
Ты — строгий математический проверяющий.
Ответь СТРОГО одним словом: correct или incorrect.
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

РЕШЕНИЕ:
${a}
`.trim(),
        },
      ],
      max_output_tokens: 10,
    });

    const verdict =
      judgeResp.output_text?.trim() === "correct"
        ? "correct"
        : "incorrect";

    return NextResponse.json({
      ok: true,
      verdict,
      feedback,
      next:
        verdict === "incorrect"
          ? "Попробуй ещё раз, исправив ошибку."
          : "",
    });
  } catch (err) {
    if (isRegionBlock(err)) {
      return NextResponse.json(
        {
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
