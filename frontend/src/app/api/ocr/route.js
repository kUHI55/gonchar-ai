import { NextResponse } from "next/server";
import OpenAI from "openai";

// ✅ антиспам
import {
  getVisitorId,
  checkPhotoSpam,
  registerPhotoViolation,
} from "@/lib/antispam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------
// OCR text normalization
// --------------------
function normalizeOcrText(raw) {
  let s = String(raw || "");

  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/[–—]/g, "-");
  s = s.replace(/[|]/g, "");
  s = s.replace(/[“”«»]/g, '"');
  s = s.replace(/[·’⋅]/g, "*");
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/([a-zA-Z0-9)\]])\s*²/g, "$1^2");
  s = s.replace(/([a-zA-Z0-9)\]])\s*³/g, "$1^3");
  s = s.replace(/([a-zA-Z)\]])\s*([2-9])\b/g, "$1^$2");
  s = s.replace(/\s*=\s*/g, " = ");

  return s.trim();
}

// --------------------
// POST — OCR + ANTISPAM
// --------------------
export async function POST(req) {
  try {
    // 🔐 visitor
    const visitorId = getVisitorId(req);

    // 🔒 already banned?
    const spamCheck = await checkPhotoSpam(visitorId);
    if (spamCheck.blocked) {
      return NextResponse.json(
        { error: spamCheck.message },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { error: "Нет изображения" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // GPT expects image_url (data URL)
    const base64 = buffer.toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Распознай текст решения по математике с фото. " +
                "Верни ТОЛЬКО текст, без комментариев. " +
                "Сохрани структуру строк.",
            },
            {
              type: "input_image",
              image_url: dataUrl,
            },
          ],
        },
      ],
      max_output_tokens: 800,
    });

    const rawText =
      response.output_text?.trim() || "";

    // --------------------
    // 🧨 NOT MATH → STRIKE
    // --------------------
    const looksLikeMath =
      /[=+\-*/^]|x|y|sin|cos|tan|sqrt|\d/.test(
        rawText.toLowerCase()
      );

    if (!looksLikeMath) {
      const penalty = await registerPhotoViolation(visitorId);

      if (penalty.strikes === 1) {
        return NextResponse.json(
          {
            error:
              "Это фото не похоже на математическое решение. " +
              "Если отправишь не по теме ещё раз — доступ будет временно заблокирован.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Доступ временно заблокирован." },
        { status: 403 }
      );
    }

    // --------------------
    // ✅ OK
    // --------------------
    const cleanedText = normalizeOcrText(rawText);

    return NextResponse.json({
      ok: true,
      text: cleanedText,
      raw: rawText, // для дебага
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "OCR server error" },
      { status: 500 }
    );
  }
}
