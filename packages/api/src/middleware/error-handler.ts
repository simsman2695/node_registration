import { Next, Request, Response } from "restify";

export function errorHandler(
  req: Request,
  res: Response,
  err: any,
  next: Next
): void {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[${req.method}] ${req.url} - ${status}: ${message}`);

  res.send(status, {
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });

  return next();
}
