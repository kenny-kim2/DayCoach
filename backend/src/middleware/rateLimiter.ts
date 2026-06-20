import { Request, Response, NextFunction } from "express";

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// 60초 윈도우에 IP당 최대 10회
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

// 1분마다 만료된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, WINDOW_MS);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "rate_limited",
      message: "잠시 후 다시 시도해주세요. (1분에 최대 10회)",
    });
    return;
  }

  next();
}
