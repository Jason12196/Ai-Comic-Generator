import bcrypt from "bcryptjs";

import { getDatabase } from "../db/database.js";
import type { AuthUser } from "../types/index.js";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at
  };
}

export const authService = {
  register(username: string, password: string) {
    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const db = getDatabase();
    const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(normalizedUsername);
    if (existingUser) {
      throw new Error("Username already exists");
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(normalizedUsername, passwordHash);

    const createdUser = db
      .prepare("SELECT id, username, password_hash, created_at FROM users WHERE id = ?")
      .get(result.lastInsertRowid) as UserRow;

    return mapUser(createdUser);
  },

  login(username: string, password: string) {
    const db = getDatabase();
    const user = db
      .prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?")
      .get(username.trim()) as UserRow | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new Error("Invalid username or password");
    }

    return mapUser(user);
  },

  findUserById(userId: number) {
    const db = getDatabase();
    const user = db
      .prepare("SELECT id, username, password_hash, created_at FROM users WHERE id = ?")
      .get(userId) as UserRow | undefined;

    return user ? mapUser(user) : null;
  }
};
