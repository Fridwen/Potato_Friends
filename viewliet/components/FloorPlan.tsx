"use client";
import {
  Space,
  colors,
  walls,
  viewpoint,
  displayZones,
  levelSpace,
  loftStairs,
} from "@/lib/space";
export default function FloorPlan({
  space,
  active,
  onSelect,
}: {
  space: Space;
  active: string;
  onSelect: (id: string) => void;
}) {
  const original = space;
  const upper = active === "loft" && !!space.loft;
  space = levelSpace(space, upper);
  const { width: w, depth: d } = space.shell;
  const shown = displayZones(space);
  const zone = space.zones.find((z) => z.id === active);
  const point = zone ? viewpoint(space, zone) : null;
  return (
    <svg
      className="floor-plan"
      viewBox={`-.65 -.65 ${w + 1.3} ${d + 1.3}`}
      role="img"
      aria-label={`추정 평면도, ${(space.shell.width * space.shell.depth).toFixed(1)}제곱미터`}
    >
      <defs>
        <pattern
          id="tiles"
          width=".35"
          height=".35"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M .35 0 L 0 0 0 .35"
            fill="none"
            stroke="#d5ddd8"
            strokeWidth=".008"
          />
        </pattern>
      </defs>
      <rect width={w} height={d} fill="#eee8dd" />
      {space.zones.map((z) => (
        <g
          key={z.id}
          onClick={() =>
            onSelect(shown.find((item) => item.name === z.name)!.id)
          }
          tabIndex={0}
          role="button"
          aria-label={`${upper ? "복층" : z.name}으로 시점 이동`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(shown.find((item) => item.name === z.name)!.id);
            }
          }}
        >
          <rect
            x={z.x}
            y={z.z}
            width={z.width}
            height={z.depth}
            fill={z.name === "화장실" ? "url(#tiles)" : "#eee8dd"}
            stroke="none"
          />
          {shown.some((item) => item.id === z.id) && (
            <text
              x={z.x + z.width / 2}
              y={z.z + z.depth / 2}
              textAnchor="middle"
              fontSize=".12"
              fill="#837d72"
            >
              {upper ? "복층" : z.name}
            </text>
          )}
        </g>
      ))}
      {walls(space).map((p) => (
        <line
          key={p.id}
          x1={p.x}
          y1={p.z}
          x2={p.x + (p.axis === "x" ? p.length : 0)}
          y2={p.z + (p.axis === "z" ? p.length : 0)}
          stroke="#494d42"
          strokeWidth=".075"
        />
      ))}
      {space.openings.map((o) => {
        const p = walls(space).find((w) => w.id === o.wallId)!;
        const x = p.x + (p.axis === "x" ? o.offset : 0),
          z = p.z + (p.axis === "z" ? o.offset : 0);
        return (
          <g
            key={o.id}
            transform={`translate(${x} ${z}) rotate(${p.axis === "x" ? 0 : 90}) scale(1 ${p.id === "south" || p.id === "west" ? -1 : 1})`}
          >
            <line
              x2={o.width}
              stroke={o.kind === "window" ? "#90b8b5" : "#eee8dd"}
              strokeWidth=".09"
            />
            {o.kind === "window" && (
              <line x2={o.width} stroke="#effafa" strokeWidth=".025" />
            )}
          </g>
        );
      })}
      {original.loft && (
        <g pointerEvents="none">
          <rect
            x={original.loft.x}
            y={original.loft.z}
            width={original.loft.width}
            height={original.loft.depth}
            fill={upper ? "#dfc9a844" : "none"}
            stroke="#8c7050"
            strokeWidth=".035"
            strokeDasharray={upper ? undefined : ".12 .07"}
          />
          {(() => {
            const stair = loftStairs(original)!;
            const a = original.loft!.stairs;
            const vertical = a.side === "north" || a.side === "south";
            return (
              <g>
                <rect
                  x={stair.x}
                  y={stair.z}
                  width={stair.width}
                  height={stair.depth}
                  fill="#bfa37c66"
                  stroke="#8c7050"
                  strokeWidth=".02"
                />
                {Array.from({ length: 10 }, (_, i) => (
                  <line
                    key={i}
                    x1={stair.x + (vertical ? 0 : (stair.width * i) / 10)}
                    y1={stair.z + (vertical ? (stair.depth * i) / 10 : 0)}
                    x2={
                      stair.x +
                      (vertical ? stair.width : (stair.width * i) / 10)
                    }
                    y2={
                      stair.z +
                      (vertical ? (stair.depth * i) / 10 : stair.depth)
                    }
                    stroke="#8c7050"
                    strokeWidth=".015"
                  />
                ))}
                <text
                  x={stair.x + stair.width / 2}
                  y={stair.z + stair.depth / 2}
                  fontSize=".15"
                  textAnchor="middle"
                >
                  계단
                </text>
              </g>
            );
          })()}
        </g>
      )}
      {space.furniture.map((f) => (
        <g key={f.id} transform={`translate(${f.x} ${f.z})`}>
          <g transform={`rotate(${f.rotation})`}>
            <rect
              x={-f.width / 2}
              y={-f.depth / 2}
              width={f.width}
              height={f.depth}
              rx=".035"
              fill={colors[f.kind]}
              stroke="#857f70"
              strokeWidth=".018"
            />
            {f.kind === "bed" && (
              <>
                <rect
                  x={-f.width / 2 + 0.08}
                  y={-f.depth / 2 + 0.09}
                  width={f.width - 0.16}
                  height=".35"
                  rx=".04"
                  fill="#f5f1e7"
                />
                <path
                  d={`M ${-f.width / 2} ${-f.depth / 2 + 0.55} h ${f.width}`}
                  stroke="#d7e0ce"
                  strokeWidth=".035"
                />
              </>
            )}
            {f.kind === "washer" && (
              <circle
                r={f.width * 0.28}
                fill="#dce5e4"
                stroke="#97a8a7"
                strokeWidth=".025"
              />
            )}
          </g>
          <text y=".04" textAnchor="middle" fontSize=".105" fill="#41483d">
            {f.name}
          </text>
        </g>
      ))}
      {point && (
        <g transform={`translate(${point.x} ${point.z})`}>
          <circle r=".17" fill="#638168" opacity=".18" />
          <circle r=".065" fill="#426949" stroke="white" strokeWidth=".025" />
        </g>
      )}
      <g stroke="#ada99d" strokeWidth=".012">
        <path d={`M 0 -.2 v -.15 M ${w} -.2 v -.15 M 0 -.28 H ${w}`} />
        <path d={`M -.2 0 h -.15 M -.2 ${d} h -.15 M -.28 0 V ${d}`} />
      </g>
      <text
        x={w / 2}
        y="-.38"
        fontSize=".13"
        textAnchor="middle"
        fill="#7a7d72"
      >
        {w.toFixed(2)} m
      </text>
      <text
        transform={`translate(-.4 ${d / 2}) rotate(-90)`}
        fontSize=".13"
        textAnchor="middle"
        fill="#7a7d72"
      >
        {d.toFixed(2)} m
      </text>
    </svg>
  );
}
