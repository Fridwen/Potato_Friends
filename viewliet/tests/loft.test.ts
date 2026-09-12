import { test } from "node:test";
import assert from "node:assert/strict";
import { loftDemoSpace, example } from "../lib/example";
import { normalize, loftStairs, levelSpace } from "../lib/space";
const fixture = () => {
  const raw = structuredClone(loftDemoSpace);
  raw.loft!.evidence = {
    source: "observed",
    photos: [1],
    reason: "복층 바닥 확인",
  };
  raw.furniture.forEach(
    (f) =>
      (f.evidence = { source: "observed", photos: [1], reason: "가구 확인" }),
  );
  return raw;
};
test("loft preserves separate footprint and total height", () => {
  const s = normalize(fixture(), 20, 1);
  assert.equal(s.shell.height, 4.2);
  assert.ok(Math.abs(s.shell.width * s.shell.depth - 20) < 1e-9);
  assert.equal(s.loft!.width * s.loft!.depth, 8);
  assert.equal(s.area, 20);
  assert.ok(s.loft!.elevation + 1.2 <= s.shell.height);
});
test("stairs are bounded and meet the loft entry edge", () => {
  for (const side of ["north", "south", "east", "west"] as const) {
    const raw = fixture();
    raw.loft!.stairs.side = side;
    raw.loft!.stairs.run = -3;
    raw.loft!.stairs.width = 99;
    raw.loft!.stairs.offset = -10;
    const s = normalize(raw, 20, 1),
      a = loftStairs(s)!;
    assert.ok(
      a.x >= 0 &&
        a.z >= 0 &&
        a.x + a.width <= s.shell.width + 1e-8 &&
        a.z + a.depth <= s.shell.depth + 1e-8,
    );
    assert.ok(a.width > 0 && a.depth > 0);
    assert.ok(Math.abs(a.z - s.loft!.z - s.loft!.depth) < 1e-8);
  }
});
test("upper furniture stays on loft and is absent from ground plan", () => {
  const raw = fixture();
  const id = raw.loft!.furnitureIds[0];
  const f = raw.furniture.find((f) => f.id === id)!;
  f.x = 99;
  f.z = -99;
  f.width = 99;
  f.height = 99;
  const s = normalize(raw, 20, 1),
    upper = levelSpace(s, true),
    ground = levelSpace(s, false),
    l = s.loft!;
  assert.equal(upper.furniture.length, 1);
  assert.ok(!ground.furniture.some((f) => l.furnitureIds.includes(f.id)));
  for (const f of upper.furniture) {
    assert.ok(
      f.x - f.width / 2 >= l.x - 1e-8 &&
        f.x + f.width / 2 <= l.x + l.width + 1e-8,
    );
    assert.ok(
      f.z - f.depth / 2 >= l.z - 1e-8 &&
        f.z + f.depth / 2 <= l.z + l.depth + 1e-8,
    );
    assert.ok(f.height + l.elevation < s.shell.height);
  }
});
test("unsupported loft does not invent loft or relocate upper objects downstairs", () => {
  const raw = fixture();
  raw.loft!.evidence.source = "inferred";
  const id = raw.loft!.furnitureIds[0];
  const identity = raw.furniture.find((f) => f.id === id)!.identity;
  const s = normalize(raw, 20, 1);
  assert.equal(s.loft, null);
  assert.ok(!s.furniture.some((f) => f.identity === identity));
  assert.equal(normalize(example, 20).loft, null);
});
test("loft with no staircase clearance is explicitly omitted", () => {
  const raw = fixture();
  raw.loft!.depth = 5;
  const s = normalize(raw, 20, 1);
  assert.equal(s.loft, null);
  assert.ok(s.corrections.some((n) => n.includes("여유")));
});
