import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    request.body = result.data;
    next();
  };
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Request body failed validation.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({ message: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ message: "Internal server error." });
}
