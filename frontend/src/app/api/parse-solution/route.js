import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const form = await req.formData();

    const text = (form.get("text") || "").toString().trim();
    const image = form.get("image"); // File | null

    if (!text && !image) {
      return NextResponse.json(
        { error: "Нужно либо text, либо image" },
        { status: 400 }
      );
    }

    // Если ученик уже ввёл текст — просто возвращаем его как “распознанное”
    if (text && !image) {
      return NextResponse.json({ ok: true, parsedText: text, source: "text" });
    }

    // Иначе читаем фото через vision-модель
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const buf = Buffer.from(await image.arrayBuffer());
    const mime = image.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    // gpt-4.1-mini поддерживает image input :contentReference[oaicite:0]{index=0}
    const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const system = `
Ты — OCR+матем-ассистент.
Твоя задача: перепечатать (транскрибировать) то, что написано на фото.

Правила:
- Верни ТОЛЬКО текст, без объяснений.
- Сохраняй структуру строк.
- Формулы пиши обычным текстом: x^2, (x+2)(x+3), 2x-5, дробь как (a/b).
- Если кусок не читается — поставь [неразборчиво].
`.trim();

    const user = [
      { type: "input_text", text: "Перепечатай решение ученика с изображения:" },
      { type: "input_image", image_url: dataUrl },
    ];

    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens: 500,
    });

    const parsedText = (resp.output_text || "").trim();

    return NextResponse.json({
      ok: true,
      parsedText: parsedText || "[неразборчиво]",
      source: "image",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
