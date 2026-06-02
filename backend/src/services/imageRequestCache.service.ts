import crypto from "node:crypto";

import type { ImageGenerationResult } from "../providers/types.js";

type CachedImageEntry = {
  expiresAt: number;
  value: ImageGenerationResult;
};

export type ImageRequestCacheStatus = "miss" | "shared" | "hit";

const DEFAULT_TTL_MS = 1000 * 60 * 30;

export class ImageRequestCacheService {
  private completed = new Map<string, CachedImageEntry>();
  private inflight = new Map<string, Promise<ImageGenerationResult>>();

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.completed.entries()) {
      if (entry.expiresAt <= now) {
        this.completed.delete(key);
      }
    }
  }

  normalizeRequestKey(requestKey: string) {
    return crypto.createHash("sha256").update(requestKey).digest("hex");
  }

  async getOrCreate(requestKey: string, factory: () => Promise<ImageGenerationResult>) {
    this.cleanup();
    const normalizedKey = this.normalizeRequestKey(requestKey);
    const cached = this.completed.get(normalizedKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        result: cached.value,
        cacheStatus: "hit" as ImageRequestCacheStatus
      };
    }

    const existingInflight = this.inflight.get(normalizedKey);
    if (existingInflight) {
      const sharedResult = await existingInflight;
      return {
        result: sharedResult,
        cacheStatus: "shared" as ImageRequestCacheStatus
      };
    }

    const promise = factory()
      .then((result) => {
        this.completed.set(normalizedKey, {
          expiresAt: Date.now() + DEFAULT_TTL_MS,
          value: result
        });
        this.inflight.delete(normalizedKey);
        return result;
      })
      .catch((error) => {
        this.inflight.delete(normalizedKey);
        throw error;
      });

    this.inflight.set(normalizedKey, promise);
    const createdResult = await promise;
    return {
      result: createdResult,
      cacheStatus: "miss" as ImageRequestCacheStatus
    };
  }
}

export const imageRequestCacheService = new ImageRequestCacheService();
