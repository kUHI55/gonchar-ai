import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // читаем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 👉 GPT Vision (через Responses API)
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
                "Верни ТОЛЬКО распознанный текст. " +
                "Без комментариев, без объяснений, без форматирования.",
            },
            {
              type: "input_image",
              image_base64: buffer.toString("base64"),
            },
          ],
        },
      ],
    });

    // 👉 универсально достаём текст
    const text =
      response.output_text ||
      response.output?.[0]?.content
        ?.filter((c) => c.type === "output_text")
        ?.map((c) => c.text)
        ?.join("\n") ||
      "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Не удалось распознать текст" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      text: text.trim(),
    });
  } catch (e) {
    console.error("OCR error:", e);
    return NextResponse.json(
      { error: "Ошибка OCR" },
      { status: 500 }
    );
  }
}