import type { NextFunction, Request, Response } from "express";

import { authService } from "../services/auth.service.js";
import { getAuthCookieName, verifyAuthToken } from "../utils/auth.js";
import { errorResponse } from "../utils/response.js";

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const token = request.cookies?.[getAuthCookieName()];
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAuthToken(token);
    const user = authService.findUserById(payload.userId);
    if (user) {
      request.authUser = user;
    }
  } catch {
    // Ignore invalid tokens in optional auth mode.
  }

  next();
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[getAuthCookieName()];
  if (!token) {
    return response.status(401).json(errorResponse("Authentication required"));
  }

  try {
    const payload = verifyAuthToken(token);
    const user = authService.findUserById(payload.userId);
    if (!user) {
      return response.status(401).json(errorResponse("Session is no longer valid"));
    }

    request.authUser = user;
    return next();
  } catch {
    return response.status(401).json(errorResponse("Invalid session"));
  }
}
