import type { Request, Response } from "express";

export function getHealth(_request: Request, response: Response) {
  response.json({
    success: true,
    message: "AI Comic Generator backend is running",
    timestamp: new Date().toISOString()
  });
}
