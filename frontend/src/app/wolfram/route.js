import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "No query provided" },
        { status: 400 }
      );
    }

    const appid = process.env.WOLFRAM_APPID;

    if (!appid) {
      return NextResponse.json(
        { error: "Wolfram AppID not configured" },
        { status: 500 }
      );
    }

    const url = `https://api.wolframalpha.com/v2/query?` +
      `appid=${appid}` +
      `&input=${encodeURIComponent(query)}` +
      `&output=json`;

    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Wolfram request failed", details: String(err) },
      { status: 500 }
    );
  }
}
