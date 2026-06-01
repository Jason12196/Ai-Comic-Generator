import jwt from "jsonwebtoken";

import type { AuthUser } from "../types/index.js";

const TOKEN_COOKIE_NAME = "ai_comic_session";

type AuthTokenPayload = {
  userId: number;
  username: string;
};

function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() || "dev-ai-comic-secret";
}

export function getAuthCookieName() {
  return TOKEN_COOKIE_NAME;
}

export function signAuthToken(user: Pick<AuthUser, "id" | "username">) {
  const payload: AuthTokenPayload = {
    userId: user.id,
    username: user.username
  };

  const expiresIn = (process.env.JWT_EXPIRES_IN || "30d") as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}
