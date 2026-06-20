import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("[ErrorHandler]", err.message, err.stack);

  if (res.headersSent) {
    next(err);
    return;
  }

  const status = (err as NodeJS.ErrnoException & { status?: number }).status ?? 500;

  res.status(status).json({
    error: "analysis_failed",
    message: "분석 중 오류가 발생했습니다. 다시 시도해주세요.",
  });
}
