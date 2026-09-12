import { createHash } from "node:crypto";
import type { Space } from "./space";
export function analysisKey(
  images: string[],
  area: number,
  apiKey: string,
  revision: string,
) {
  // Scope to API credential and ordered inputs. Never retain the key or image bytes in cache.
  const hash = createHash("sha256")
    .update(revision)
    .update("\0")
    .update(apiKey)
    .update("\0")
    .update(String(area));
  for (const image of images) hash.update("\0").update(image);
  return hash.digest("hex");
}
export class AnalysisCache {
  private results = new Map<string, { space: Space; expires: number }>();
  private pending = new Map<string, Promise<Space>>();
  constructor(
    private ttlMs = 300000,
    private capacity = 12,
    private now = Date.now,
  ) {}
  async run(
    key: string,
    compute: () => Promise<Space>,
    force = false,
  ): Promise<{ space: Space; cached: boolean }> {
    for (const [id, item] of this.results)
      if (item.expires <= this.now()) this.results.delete(id);
    if (force) this.results.delete(key);
    const saved = this.results.get(key);
    if (saved) return { space: structuredClone(saved.space), cached: true };
    const existing = this.pending.get(key);
    if (existing)
      return { space: structuredClone(await existing), cached: true };
    const job = Promise.resolve().then(compute);
    this.pending.set(key, job);
    try {
      const space = await job;
      if (this.results.size >= this.capacity)
        this.results.delete(this.results.keys().next().value!);
      this.results.set(key, {
        space: structuredClone(space),
        expires: this.now() + this.ttlMs,
      });
      return { space, cached: false };
    } finally {
      this.pending.delete(key);
    }
  }
}
export const analysisCache = new AnalysisCache();
