import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalysisCache, analysisKey } from "../lib/analysis-cache";
import { demoSpace } from "../lib/example";
test("identical requests reuse result without another AI call, with isolated copies", async () => {
  const cache = new AnalysisCache();
  let calls = 0;
  const compute = async () => {
    calls++;
    return structuredClone(demoSpace);
  };
  const first = await cache.run("a", compute);
  first.space.furniture = [];
  const second = await cache.run("a", compute);
  assert.equal(calls, 1);
  assert.equal(second.cached, true);
  assert.ok(second.space.furniture.length > 0);
});
test("concurrent identical requests share one analysis", async () => {
  const cache = new AnalysisCache();
  let calls = 0;
  const compute = async () => {
    calls++;
    return demoSpace;
  };
  await Promise.all([cache.run("a", compute), cache.run("a", compute)]);
  assert.equal(calls, 1);
});
test("expired and failed analyses do not poison retry", async () => {
  let now = 0;
  const cache = new AnalysisCache(100, 2, () => now);
  let calls = 0;
  const compute = async () => {
    calls++;
    return demoSpace;
  };
  await cache.run("a", compute);
  now = 101;
  await cache.run("a", compute);
  assert.equal(calls, 2);
  await assert.rejects(
    cache.run("b", async () => {
      throw new Error("retry");
    }),
  );
  assert.equal((await cache.run("b", compute)).cached, false);
});
test("cache is bounded and keys include photos order area credential revision", async () => {
  const cache = new AnalysisCache(1000, 1);
  await cache.run("a", async () => demoSpace);
  await cache.run("b", async () => demoSpace);
  assert.equal((await cache.run("a", async () => demoSpace)).cached, false);
  const key = analysisKey(["a", "b"], 20, "key", "v1");
  for (const other of [
    analysisKey(["b", "a"], 20, "key", "v1"),
    analysisKey(["a", "b"], 21, "key", "v1"),
    analysisKey(["a", "b"], 20, "different", "v1"),
    analysisKey(["a", "b"], 20, "key", "v2"),
  ])
    assert.notEqual(key, other);
});

test("explicit reanalysis bypasses recent result cache", async () => {
  const cache = new AnalysisCache();
  let calls = 0;
  const compute = async () => {
    calls++;
    return demoSpace;
  };
  await cache.run("a", compute);
  assert.equal((await cache.run("a", compute, true)).cached, false);
  assert.equal(calls, 2);
});
