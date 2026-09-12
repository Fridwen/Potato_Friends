import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  wallPieces,
  SpaceSchema,
  displayZones,
  inferred,
} from "../lib/space";
import { example } from "../lib/example";
const copy = () => {
  const r = structuredClone(example);
  const e = {
    source: "observed" as const,
    photos: [1],
    reason:
      "Test fixture: existence and approximate placement visible in photo 1; dimensions estimated.",
  };
  r.shell.evidence = e;
  for (const list of [
    r.zones,
    r.partitions,
    r.openings,
    r.furniture,
    r.connections,
  ])
    for (const item of list) item.evidence = { ...e };
  return r;
};
test("single shell area and disjoint zone union respect lower area limit", () => {
  const raw = copy();
  const s = normalize(raw, 27);
  assert.ok(Math.abs(s.shell.width * s.shell.depth - 21.6) < 1e-9);
  assert.ok(
    Math.abs(s.zones.reduce((n, z) => n + z.width * z.depth, 0) - 21.6) < 1e-9,
  );
  for (let i = 0; i < s.zones.length; i++)
    for (let j = 0; j < i; j++) {
      const a = s.zones[i],
        b = s.zones[j];
      const overlap =
        Math.max(
          0,
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
        ) *
        Math.max(
          0,
          Math.min(a.z + a.depth, b.z + b.depth) - Math.max(a.z, b.z),
        );
      assert.ok(overlap < 1e-9);
    }
});
test("negative sizes and rotated furniture remain inside bounds", () => {
  const raw = copy();
  raw.shell.height = -9;
  raw.furniture[0] = {
    ...raw.furniture[0],
    width: -3,
    depth: 100,
    x: -8,
    z: 100,
    rotation: 91,
    height: -4,
  };
  const s = normalize(raw, 8);
  for (const f of s.furniture) {
    const swap = f.rotation % 180 !== 0;
    const hx = (swap ? f.depth : f.width) / 2,
      hz = (swap ? f.width : f.depth) / 2;
    assert.ok(f.width > 0 && f.depth > 0 && f.height > 0);
    assert.ok(f.x - hx >= 0 && f.x + hx <= s.shell.width);
    assert.ok(f.z - hz >= 0 && f.z + hz <= s.shell.depth);
  }
  assert.equal(s.shell.height, 2.4);
});
test("same furniture identity from different photos is merged", () => {
  const raw = copy();
  raw.furniture.push({ ...raw.furniture[0], id: "new-photo-bed", x: 2 });
  assert.equal(
    normalize(raw, 20).furniture.filter((f) => f.kind === "bed").length,
    1,
  );
});
test("unobserved evidence is not represented as observed", () => {
  const raw = copy();
  raw.furniture[0].evidence = {
    source: "observed",
    photos: [0, 8],
    reason: "test",
  };
  assert.ok(!normalize(raw, 20, 2).furniture.some((f) => f.kind === "bed"));
});
test("invalid numbers and schema are rejected", () => {
  assert.throws(() => normalize({}, 20));
  assert.throws(() => normalize(example, NaN));
  assert.throws(() => normalize(example, 0));
  const raw = copy();
  raw.shell.width = Infinity;
  assert.throws(() => normalize(raw, 20));
});
test("doors are actual holes in wall mesh", () => {
  const s = normalize(copy(), 20);
  const door = s.openings.find((o) => o.wallId === "north")!;
  const p = { x: door.offset + door.width / 2, y: 1, z: 0 };
  assert.equal(
    wallPieces(s).some(
      (b) =>
        Math.abs(p.x - b.x) < b.width / 2 &&
        Math.abs(p.y - b.y) < b.height / 2 &&
        Math.abs(p.z - b.z) < b.depth / 2,
    ),
    false,
  );
});
test("unknown wall references and dangling connections removed", () => {
  const raw = copy();
  raw.openings.push({ ...raw.openings[0], id: "bad", wallId: "missing" });
  raw.connections.push({
    from: "missing",
    to: "living",
    evidence: raw.shell.evidence,
  });
  const s = normalize(raw, 20);
  assert.ok(!s.openings.some((o) => o.wallId === "missing"));
  assert.ok(!s.connections.some((c) => c.from === "missing"));
});
test("normalization is deterministic", () => {
  assert.deepEqual(normalize(copy(), 20), normalize(copy(), 20));
  assert.equal(SpaceSchema.safeParse(example).success, true);
});

test("unsupported bathroom, walls, fixtures and connections are omitted from the final shared JSON", () => {
  const raw = copy();
  raw.zones[0].evidence = inferred("No bathroom visible");
  raw.partitions.forEach(
    (p) => (p.evidence = inferred("Assumed bathroom wall")),
  );
  raw.openings
    .filter((o) => o.wallId.startsWith("bath"))
    .forEach((o) => (o.evidence = inferred("Assumed bathroom door")));
  raw.furniture
    .filter((f) => f.kind === "toilet" || f.kind === "washer")
    .forEach((f) => (f.evidence = inferred("Typical bathroom fixture")));
  raw.connections.forEach((c) => (c.evidence = inferred("Unseen connection")));
  const s = normalize(raw, 20, 1);
  assert.deepEqual(
    displayZones(s).map((z) => z.name),
    ["방"],
  );
  assert.equal(s.partitions.length, 0);
  assert.ok(!s.openings.some((o) => o.wallId.startsWith("partition")));
  assert.ok(
    !s.furniture.some((f) => f.kind === "toilet" || f.kind === "washer"),
  );
  assert.equal(s.connections.length, 0);
  assert.ok(s.furniture.some((f) => f.kind === "bed"));
  assert.equal(s.shell.width * s.shell.depth, 20);
});
test("unknown remainder is not automatically converted into a room or connection", () => {
  const raw = copy();
  raw.zones = [{ ...raw.zones[1], x: 0, z: 2, width: 2, depth: 2 }];
  raw.connections = [];
  const s = normalize(raw, 20, 1);
  assert.equal(s.zones.length, 1);
  assert.equal(s.zones[0].width * s.zones[0].depth, 4);
  assert.equal(s.connections.length, 0);
  assert.equal(s.shell.width * s.shell.depth, 20);
});
test("one main room and bathroom get one label and movement target each, even when the room wraps around the bathroom", () => {
  const s = normalize(copy(), 20, 1);
  assert.ok(s.zones.length > 2);
  assert.deepEqual(
    displayZones(s).map((z) => z.name),
    ["방", "화장실"],
  );
  assert.equal(
    s.zones.reduce((total, z) => total + z.width * z.depth, 0),
    20,
  );
});
test("empty observations produce no invented zones or objects; static demo remains explicit", () => {
  const s = normalize(example, 20, 1);
  for (const items of [
    s.zones,
    s.partitions,
    s.openings,
    s.furniture,
    s.connections,
  ])
    assert.equal(items.length, 0);
  const demo = normalize(example, 20, 0, { illustrativeDemo: true });
  assert.equal(displayZones(demo).length, 2);
  assert.ok(demo.furniture.length > 0);
  assert.ok(demo.furniture.every((f) => f.evidence.source === "inferred"));
});
test("visible door retains its supporting wall even when wall placement is estimated", () => {
  const raw = copy();
  raw.partitions[0].evidence = inferred("No placement evidence");
  raw.openings.push({
    ...raw.openings[0],
    id: "on-removed-wall",
    wallId: raw.partitions[0].id,
  });
  const s = normalize(raw, 20, 1);
  assert.equal(s.partitions.length, 2);
  assert.equal(
    s.openings.filter((o) => o.wallId.startsWith("partition")).length,
    2,
  );
});

test("visible walls doors and furniture survive inferred coordinates and sizes", () => {
  const raw = copy();
  for (const list of [raw.partitions, raw.openings, raw.furniture])
    for (const item of list)
      item.evidence.reason =
        "Visible in photo 1; location, size and orientation are estimates.";
  raw.furniture[0].x = -10;
  raw.openings[0].width = -1;
  raw.partitions[0].length = -1;
  const s = normalize(raw, 20, 1);
  assert.equal(s.furniture.length, raw.furniture.length);
  assert.equal(s.openings.length, raw.openings.length);
  assert.equal(s.partitions.length, raw.partitions.length);
  assert.ok(s.openings.every((o) => o.width > 0));
});

test("area tolerance preserves in-range estimates and caps oversized shells", () => {
  for (const [input, expected] of [
    [20, 20],
    [22, 20],
    [25, 20],
    [30, 24],
    [16, 16],
  ]) {
    const s = normalize(copy(), input);
    assert.ok(Math.abs(s.shell.width * s.shell.depth - expected) < 1e-9);
    assert.equal(s.area, input);
  }
});
