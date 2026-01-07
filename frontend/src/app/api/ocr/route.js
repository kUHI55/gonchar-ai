import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 Нормализация OCR-текста (очистка мусора)
function normalizeOcrText(raw) {
  let s = String(raw || "");

  // переносы строк
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // разные тире → обычный минус
  s = s.replace(/[–—]/g, "-");

  // мусор OCR
  s = s.replace(/[|]/g, "");
  s = s.replace(/[“”«»]/g, '"');

  // точки умножения → *
  s = s.replace(/[·∙⋅]/g, "*");

  // нормализация пробелов
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");

  // степени: ² ³ → ^2 ^3
  s = s.replace(/([a-zA-Z0-9\)\]])\s*²/g, "$1^2");
  s = s.replace(/([a-zA-Z0-9\)\]])\s*³/g, "$1^3");

  // x2 → x^2, (x+1)2 → (x+1)^2
  s = s.replace(/([a-zA-Z\)\]])\s*([2-9])\b/g, "$1^$2");

  // пробелы вокруг "="
  s = s.replace(/\s*=\s*/g, " = ");

  return s.trim();
}

// 🔹 POST — распознавание фото
export async function POST(req) {
  try {
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
              image_base64: buffer.toString("base64"),
            },
          ],
        },
      ],
      max_output_tokens: 800,
    });

    const rawText =
      response.output_text?.trim() ||
      "Не удалось распознать текст";

    const cleanedText = normalizeOcrText(rawText);

    return NextResponse.json({
      ok: true,
      text: cleanedText,
      raw: rawText, // оставляем для дебага
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "OCR server error" },
      { status: 500 }
    );
  }
}