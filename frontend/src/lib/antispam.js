// frontend/src/lib/antispam.js

import crypto from "crypto";
import { Redis } from "@upstash/redis";

// Redis клиент
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ---------- helpers ----------

// стабильный visitorId (НЕ IP)
export function getVisitorId(req) {
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";

  return crypto
    .createHash("sha256")
    .update(ua + "|" + lang)
    .digest("hex");
}

// ---------- PHOTO RULES ----------
// 1 warning → 1h ban → 24h ban

export async function checkPhotoSpam(visitorId) {
  const key = `photo:${visitorId}`;
  const data = (await redis.get(key)) || { strikes: 0 };

  // если забанен
  if (data.bannedUntil && Date.now() < data.bannedUntil) {
    const minutes = Math.ceil((data.bannedUntil - Date.now()) / 60000);
    return {
      blocked: true,
      message: `Доступ заблокирован на ${minutes} мин.`,
    };
  }

  return { blocked: false, strikes: data.strikes };
}

export async function registerPhotoViolation(visitorId) {
  const key = `photo:${visitorId}`;
  const data = (await redis.get(key)) || { strikes: 0 };

  data.strikes += 1;

  // 2-й раз → бан 1 час
  if (data.strikes === 2) {
    data.bannedUntil = Date.now() + 60 * 60 * 1000;
  }

  // 3-й раз → бан 24 часа
  if (data.strikes >= 3) {
    data.bannedUntil = Date.now() + 24 * 60 * 60 * 1000;
  }

  await redis.set(key, data);

  return data;
}

// ---------- TEXT RULES ----------
// 1 → warning
// 2 → 30 min
// 3 → 3h
// 4 → 24h

export async function checkTextSpam(visitorId) {
  const key = `text:${visitorId}`;
  const data = (await redis.get(key)) || { strikes: 0 };

  if (data.bannedUntil && Date.now() < data.bannedUntil) {
    const minutes = Math.ceil((data.bannedUntil - Date.now()) / 60000);
    return {
      blocked: true,
      message: `Доступ заблокирован на ${minutes} мин.`,
    };
  }

  return { blocked: false, strikes: data.strikes };
}

export async function registerTextViolation(visitorId) {
  const key = `text:${visitorId}`;
  const data = (await redis.get(key)) || { strikes: 0 };

  data.strikes += 1;

  if (data.strikes === 2) {
    data.bannedUntil = Date.now() + 30 * 60 * 1000;
  }
  if (data.strikes === 3) {
    data.bannedUntil = Date.now() + 3 * 60 * 60 * 1000;
  }
  if (data.strikes >= 4) {
    data.bannedUntil = Date.now() + 24 * 60 * 60 * 1000;
  }

  await redis.set(key, data);

  return data;
}
