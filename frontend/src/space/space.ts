import { z } from "zod";
const evidence = z.object({
  source: z
    .enum(["observed", "inferred"])
    .describe(
      "Existence evidence only: observed means visible in a referenced photo even if all coordinates, size and orientation are estimated. inferred means existence itself is not visible.",
    ),
  photos: z.array(z.number().finite().int()),
  reason: z.string(),
});
const rect = {
  x: z.number().finite(),
  z: z.number().finite(),
  width: z.number().finite(),
  depth: z.number().finite(),
};
export const SpaceSchema = z.object({
  version: z.literal("1.0"),
  unit: z.literal("m"),
  shell: z.object({
    width: z.number().finite(),
    depth: z.number().finite(),
    height: z.number().finite(),
    evidence,
  }),
  zones: z
    .array(
      z.object({
        id: z.string(),
        name: z.enum(["방", "화장실"]),
        ...rect,
        evidence,
      }),
    )
    .max(10),
  partitions: z
    .array(
      z.object({
        id: z.string(),
        axis: z.enum(["x", "z"]),
        x: z.number().finite(),
        z: z.number().finite(),
        length: z.number().finite(),
        height: z.number().finite(),
        evidence,
      }),
    )
    .max(20),
  openings: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["door", "window"]),
        wallId: z.string(),
        offset: z.number().finite(),
        width: z.number().finite(),
        height: z.number().finite(),
        sill: z.number().finite(),
        evidence,
      }),
    )
    .max(30),
  furniture: z
    .array(
      z.object({
        id: z.string(),
        identity: z.string(),
        kind: z.enum([
          "bed",
          "desk",
          "chair",
          "fridge",
          "sink",
          "washer",
          "wardrobe",
          "toilet",
          "shower",
          "other",
        ]),
        name: z.string(),
        ...rect,
        height: z.number().finite(),
        rotation: z.number().finite(),
        evidence,
      }),
    )
    .max(50),
  connections: z
    .array(z.object({ from: z.string(), to: z.string(), evidence }))
    .max(30),
  assumptions: z.array(z.string()).max(30),
});
export type RawSpace = z.infer<typeof SpaceSchema>;
export type Evidence = z.infer<typeof evidence>;
export type Space = RawSpace & { area: number; corrections: string[] };
export const inferred = (reason: string): Evidence => ({
  source: "inferred",
  photos: [],
  reason,
});
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const positive = (n: number, f: number) => (n > 0 ? n : f);
export function normalize(
  input: unknown,
  area: number,
  photoCount = 6,
  options: { illustrativeDemo?: boolean } = {},
): Space {
  if (!Number.isFinite(area) || area < 8 || area > 80)
    throw new Error("전용면적은 8~80㎡로 입력해 주세요.");
  const r = SpaceSchema.parse(input);
  const original = JSON.stringify(r);
  const notes: string[] = [];
  const oldW = positive(r.shell.width, 4),
    oldD = positive(r.shell.depth, 5);
  const estimatedArea = clamp(oldW * oldD, area * 0.8, area);
  const ratio = clamp(oldW / oldD, 0.35, 2.85),
    w = Math.sqrt(estimatedArea * ratio),
    d = estimatedArea / w;
  const sx = w / oldW,
    sz = d / oldD;
  r.shell = {
    ...r.shell,
    width: w,
    depth: d,
    height: clamp(positive(r.shell.height, 2.4), 2, 3.5),
  };
  notes.push(
    "전체 외곽 면적은 입력 전용면적의 80~100%를 허용하며, 범위를 벗어날 때만 면적을 보정합니다. 평면도·사진에서 확인한 공간만 표시하며, 나머지 영역에 이름이나 칸막이를 추가하지 않습니다.",
  );
  r.assumptions.push(
    "외곽 가로세로 비율과 절대 치수는 사진을 바탕으로 추정했습니다. 벽 두께는 면적 산정에서 생략했습니다.",
  );
  const fixEvidence = (e: Evidence): Evidence => {
    const photos = [
      ...new Set(e.photos.filter((n) => n >= 1 && n <= photoCount)),
    ];
    return e.source === "observed" && photos.length
      ? { ...e, photos }
      : { ...e, photos: [], source: "inferred" };
  };
  r.shell.evidence = fixEvidence(r.shell.evidence);
  // Only existence grounded in input photos may create geometry. Dimensions may still be inferred.
  // The explicit static demo has no source photos and keeps its illustrative geometry.
  const supported = <T extends { evidence: Evidence }>(
    items: T[],
    label: string,
  ): T[] => {
    const cleaned = items.map((item) => ({
      ...item,
      evidence: fixEvidence(item.evidence),
    }));
    if (options.illustrativeDemo) return cleaned;
    const kept = cleaned.filter((item) => item.evidence.source === "observed");
    if (kept.length !== cleaned.length)
      notes.push(
        `${label} ${cleaned.length - kept.length}개는 평면도·사진 근거가 없어 도면과 3D에서 제외했습니다.`,
      );
    return kept;
  };
  r.zones = supported(r.zones, "공간");
  // An observed opening establishes the existence of its host wall, even if its pose is estimated.
  r.partitions = r.partitions.map((p) => {
    if (fixEvidence(p.evidence).source === "observed") return p;
    const openings = r.openings.filter(
      (o) => o.wallId === p.id && fixEvidence(o.evidence).source === "observed",
    );
    if (!openings.length) return p;
    return {
      ...p,
      evidence: {
        source: "observed" as const,
        photos: [
          ...new Set(openings.flatMap((o) => fixEvidence(o.evidence).photos)),
        ],
        reason:
          "사진에 보이는 문·창문을 지지하는 벽입니다. 벽의 위치와 길이는 추정했습니다.",
      },
    };
  });
  r.partitions = supported(r.partitions, "칸막이");
  r.openings = supported(r.openings, "문·창문");
  r.furniture = supported(r.furniture, "가구·설비");
  r.connections = supported(r.connections, "공간 연결");
  const originalPartitions = r.partitions;
  // Rectangle subtraction prevents double-counting; uncovered floor stays unnamed.

  type R = { x: number; z: number; width: number; depth: number };
  const subtract = (a: R, b: R): R[] => {
    const l = Math.max(a.x, b.x),
      t = Math.max(a.z, b.z),
      rr = Math.min(a.x + a.width, b.x + b.width),
      bb = Math.min(a.z + a.depth, b.z + b.depth);
    if (l >= rr || t >= bb) return [a];
    return [
      { x: a.x, z: a.z, width: a.width, depth: t - a.z },
      { x: a.x, z: bb, width: a.width, depth: a.z + a.depth - bb },
      { x: a.x, z: t, width: l - a.x, depth: bb - t },
      { x: rr, z: t, width: a.x + a.width - rr, depth: bb - t },
    ].filter((q) => q.width > 1e-6 && q.depth > 1e-6);
  };
  // One main room and, only if evidenced, one small bathroom. Never functional sub-rooms.
  const sourceZones = (["화장실", "방"] as const).flatMap((name) => {
    const matches = r.zones.filter((zone) => zone.name === name);
    const selected = matches.sort(
      (a, b) =>
        positive(b.width, 0) * positive(b.depth, 0) -
        positive(a.width, 0) * positive(a.depth, 0),
    )[0];
    return selected ? [selected] : [];
  });
  const used: R[] = [];
  const out: RawSpace["zones"] = [];
  const ids = new Set<string>();
  for (const [i, zone] of sourceZones.entries()) {
    const id = zone.id && !ids.has(zone.id) ? zone.id : `zone-${i}`;
    ids.add(id);
    const x = clamp(zone.x * sx, 0, w - 0.1),
      z = clamp(zone.z * sz, 0, d - 0.1);
    let parts: R[] = [
      {
        x,
        z,
        width: clamp(positive(zone.width * sx, 0.5), 0.1, w - x),
        depth: clamp(positive(zone.depth * sz, 0.5), 0.1, d - z),
      },
    ];
    for (const u of used) parts = parts.flatMap((p) => subtract(p, u));
    parts.forEach((p, j) =>
      out.push({
        ...zone,
        ...p,
        id: j ? `${id}-part-${j}` : id,
        evidence: fixEvidence(zone.evidence),
      }),
    );
    used.push(...parts);
  }
  r.zones = out;
  r.partitions = r.partitions
    .map((p, i) => {
      const x = clamp(p.x * sx, 0, w),
        z = clamp(p.z * sz, 0, d);
      return {
        ...p,
        id: `partition-${i}`,
        x,
        z,
        length: clamp(
          positive(p.length * (p.axis === "x" ? sx : sz), 1),
          0,
          p.axis === "x" ? w - x : d - z,
        ),
        height: clamp(positive(p.height, r.shell.height), 0.3, r.shell.height),
        evidence: fixEvidence(p.evidence),
      };
    })
    .filter((p) => p.length > 0.1);
  // Map original partition references to the canonical IDs.
  const wallMap = new Map(
    originalPartitions.map((p, i) => [p.id, `partition-${i}`]),
  );
  r.openings = r.openings.flatMap((o, i) => {
    const wallId = wallMap.get(o.wallId) || o.wallId;
    const wall = walls(r).find((p) => p.id === wallId);
    if (!wall) {
      notes.push(`${o.id}: 알 수 없는 벽의 개구부를 제거했습니다.`);
      return [];
    }
    const width = clamp(positive(o.width, 0.8), 0.2, wall.length);
    const offset = clamp(
      o.offset * (wall.axis === "x" ? sx : sz),
      0,
      wall.length - width,
    );
    const height = clamp(positive(o.height, 2), 0.2, wall.height);
    const sill = o.kind === "door" ? 0 : clamp(o.sill, 0, wall.height - height);
    if (
      r.openings
        .slice(0, i)
        .some(
          (a) =>
            a.wallId === o.wallId &&
            Math.abs(a.offset - o.offset) < 0.1 &&
            a.kind === o.kind,
        )
    )
      return [];
    return [
      {
        ...o,
        id: `opening-${i}`,
        wallId,
        width,
        offset,
        height,
        sill,
        evidence: fixEvidence(o.evidence),
      },
    ];
  });
  const identities = new Set<string>();
  r.furniture = r.furniture.flatMap((f, i) => {
    const identity = f.identity.trim().toLowerCase() || f.id;
    if (identities.has(identity)) {
      notes.push(`${f.name}: 여러 사진에서 반복된 동일 가구를 통합했습니다.`);
      return [];
    }
    identities.add(identity);
    const rotation = (((Math.round(f.rotation / 90) * 90) % 360) + 360) % 360;
    let width = clamp(positive(f.width, 0.6), 0.15, 4),
      depth = clamp(positive(f.depth, 0.6), 0.15, 4);
    const swapped = rotation === 90 || rotation === 270;
    const scale = Math.min(
      1,
      (w - 0.08) / (swapped ? depth : width),
      (d - 0.08) / (swapped ? width : depth),
    );
    width *= scale;
    depth *= scale;
    const hx = (swapped ? depth : width) / 2,
      hz = (swapped ? width : depth) / 2;
    return [
      {
        ...f,
        id: `furniture-${i}`,
        identity,
        width,
        depth,
        rotation,
        x: clamp(f.x * sx, hx + 0.02, w - hx - 0.02),
        z: clamp(f.z * sz, hz + 0.02, d - hz - 0.02),
        height: clamp(positive(f.height, 0.7), 0.1, r.shell.height - 0.1),
        evidence: fixEvidence(f.evidence),
      },
    ];
  });
  // Spatial duplicate check complements cross-photo identity deduplication.
  r.furniture = r.furniture.filter(
    (f, i, a) =>
      !a
        .slice(0, i)
        .some(
          (g) => g.kind === f.kind && Math.hypot(g.x - f.x, g.z - f.z) < 0.25,
        ),
  );
  const zoneIds = new Set(r.zones.map((z) => z.id));
  r.connections = r.connections
    .filter((c) => zoneIds.has(c.from) && zoneIds.has(c.to) && c.from !== c.to)
    .map((c) => ({ ...c, evidence: fixEvidence(c.evidence) }));
  if (JSON.stringify(r) !== original)
    notes.push(
      "외곽 밖 좌표·음수 크기·회전·천장 높이를 검증하고 유효 범위로 보정했습니다.",
    );
  r.assumptions = [
    ...new Set([
      ...r.assumptions,
      options.illustrativeDemo
        ? "체험용 예시의 구조·가구이며 실제 사진 분석 결과가 아닙니다."
        : "평면도·사진 근거가 없는 공간·칸막이·문·창문·가구는 배치하지 않았습니다. 빈 영역은 미확인 영역이며 추가 방을 의미하지 않습니다.",
      "사진에 보이는 벽·문·창문·가구는 구현하며, 위치·크기·방향은 필요에 따라 추정합니다. 문은 개구부만 표시하며 문짝·손잡이·열림 방향은 표시하지 않습니다.",
      "전체 외곽은 입력 전용면적보다 최대 20% 작은 면적을 허용한 추정 경계입니다. 시점 이동은 확인된 공간 사이의 가상 이동이며 실제 출입 경로를 보장하지 않습니다.",
    ]),
  ];
  return { ...r, area, corrections: notes };
}
// Rectangular fragments are an area calculation detail, not additional rooms.
export function displayZones(s: Space): Space["zones"] {
  return (["방", "화장실"] as const).flatMap((name) => {
    const largest = s.zones
      .filter((z) => z.name === name)
      .sort((a, b) => b.width * b.depth - a.width * a.depth)[0];
    return largest ? [largest] : [];
  });
}
export function walls(s: RawSpace) {
  return [
    {
      id: "north",
      axis: "x" as const,
      x: 0,
      z: 0,
      length: s.shell.width,
      height: s.shell.height,
    },
    {
      id: "south",
      axis: "x" as const,
      x: 0,
      z: s.shell.depth,
      length: s.shell.width,
      height: s.shell.height,
    },
    {
      id: "west",
      axis: "z" as const,
      x: 0,
      z: 0,
      length: s.shell.depth,
      height: s.shell.height,
    },
    {
      id: "east",
      axis: "z" as const,
      x: s.shell.width,
      z: 0,
      length: s.shell.depth,
      height: s.shell.height,
    },
    ...s.partitions,
  ];
}
// Shared wall tessellation, with actual holes for doors and windows.
export function wallPieces(s: Space) {
  return walls(s).flatMap((w) => {
    const openings = s.openings.filter((o) => o.wallId === w.id);
    const xs = [
      ...new Set([
        0,
        w.length,
        ...openings.flatMap((o) => [o.offset, o.offset + o.width]),
      ]),
    ].sort((a, b) => a - b);
    const ys = [
      ...new Set([
        0,
        w.height,
        ...openings.flatMap((o) => [o.sill, o.sill + o.height]),
      ]),
    ].sort((a, b) => a - b);
    const pieces: {
      x: number;
      y: number;
      z: number;
      width: number;
      height: number;
      depth: number;
    }[] = [];
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < ys.length - 1; j++) {
        const u = (xs[i] + xs[i + 1]) / 2,
          y = (ys[j] + ys[j + 1]) / 2;
        if (
          openings.some(
            (o) =>
              u > o.offset &&
              u < o.offset + o.width &&
              y > o.sill &&
              y < o.sill + o.height,
          )
        )
          continue;
        pieces.push({
          x: w.x + (w.axis === "x" ? u : 0),
          z: w.z + (w.axis === "z" ? u : 0),
          y,
          width: w.axis === "x" ? xs[i + 1] - xs[i] : 0.09,
          depth: w.axis === "z" ? xs[i + 1] - xs[i] : 0.09,
          height: ys[j + 1] - ys[j],
        });
      }
    return pieces;
  });
}
export function viewpoint(s: Space, zone: Space["zones"][number]) {
  for (let ring = 0; ring < 5; ring++)
    for (let i = 0; i < 16; i++) {
      const x = clamp(
          zone.x + zone.width / 2 + Math.cos((i * Math.PI) / 8) * ring * 0.25,
          zone.x + 0.1,
          zone.x + zone.width - 0.1,
        ),
        z = clamp(
          zone.z + zone.depth / 2 + Math.sin((i * Math.PI) / 8) * ring * 0.25,
          zone.z + 0.1,
          zone.z + zone.depth - 0.1,
        );
      if (
        !s.furniture.some((f) => {
          const swap = f.rotation % 180 !== 0;
          return (
            Math.abs(x - f.x) < (swap ? f.depth : f.width) / 2 + 0.12 &&
            Math.abs(z - f.z) < (swap ? f.width : f.depth) / 2 + 0.12
          );
        }) &&
        !s.partitions.some((p) =>
          p.axis === "x"
            ? Math.abs(z - p.z) < 0.15 && x >= p.x && x <= p.x + p.length
            : Math.abs(x - p.x) < 0.15 && z >= p.z && z <= p.z + p.length,
        )
      )
        return { x, z };
    }
  return { x: zone.x + zone.width / 2, z: zone.z + zone.depth / 2 };
}
export const colors: Record<string, string> = {
  bed: "#adbba0",
  desk: "#c39c78",
  chair: "#aaa18d",
  fridge: "#c3ced0",
  sink: "#c5beb1",
  washer: "#c3ced0",
  wardrobe: "#c7ad90",
  toilet: "#e5e5dd",
  shower: "#b9d6d1",
  other: "#c9baa5",
};
