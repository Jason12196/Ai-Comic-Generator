import type { Request, Response } from "express";
import { z } from "zod";

import { authService } from "../services/auth.service.js";
import { getAuthCookieName, signAuthToken } from "../utils/auth.js";
import { errorResponse, successResponse } from "../utils/response.js";

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

function shouldUseSecureCookie() {
  const explicitValue = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (explicitValue === "true") return true;
  if (explicitValue === "false") return false;

  return (process.env.FRONTEND_URL || "").startsWith("https://");
}

function setAuthCookie(response: Response, token: string) {
  response.cookie(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
}

export function register(request: Request, response: Response) {
  const parsed = authSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const user = authService.register(parsed.data.username, parsed.data.password);
    setAuthCookie(response, signAuthToken(user));
    return response.status(201).json(successResponse({ user }, "Registered successfully"));
  } catch (error) {
    return response.status(400).json(errorResponse(error instanceof Error ? error.message : "Registration failed"));
  }
}

export function login(request: Request, response: Response) {
  const parsed = authSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(errorResponse("Invalid request body", parsed.error.flatten()));
  }

  try {
    const user = authService.login(parsed.data.username, parsed.data.password);
    setAuthCookie(response, signAuthToken(user));
    return response.json(successResponse({ user }, "Logged in successfully"));
  } catch (error) {
    return response.status(401).json(errorResponse(error instanceof Error ? error.message : "Login failed"));
  }
}

export function logout(_request: Request, response: Response) {
  response.clearCookie(getAuthCookieName(), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie()
  });

  return response.json(successResponse({ ok: true }, "Logged out successfully"));
}

export function getCurrentUser(request: Request, response: Response) {
  if (!request.authUser) {
    return response.status(401).json(errorResponse("Not logged in"));
  }

  return response.json(successResponse({ user: request.authUser }));
}
