"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Space,
  colors,
  wallPieces,
  walls,
  viewpoint,
  displayZones,
} from "./space";
import FloorPlan from "./FloorPlan";
import { Expand, Minimize, RotateCcw, Move, Box } from "lucide-react";
export default function RoomView({
  space,
  active,
  onSelect,
}: {
  space: Space;
  active: string;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false),
    [full, setFull] = useState(false),
    [cutaway, setCutaway] = useState(false),
    [mode, setMode] = useState<"inside" | "overview">("overview"),
    [reset, setReset] = useState(0);
  const previousActive = useRef(active);
  useEffect(() => {
    if (previousActive.current !== active) {
      previousActive.current = active;
      setMode("inside");
    }
  }, [active]);
  useEffect(() => {
    const change = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    setFailed(false);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e7e9df");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    element.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(
      mode === "inside" ? 75 : 43,
      1,
      0.03,
      150,
    );
    const { width: w, depth: d, height: h } = space.shell;
    const box = (
      x: number,
      y: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      color: string,
      parent: THREE.Object3D = scene,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    scene.add(new THREE.HemisphereLight("#fffcf1", "#c2c6b4", 2));
    const light = new THREE.DirectionalLight("#fff5df", 3);
    light.position.set(w + 2, 8, d + 3);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 10;
    light.shadow.camera.bottom = -10;
    light.shadow.normalBias = 0.03;
    scene.add(light);
    box(w / 2, -0.1, d / 2, w + 0.1, 0.2, d + 0.1, "#d0c4b0");
    space.zones.forEach((zone) =>
      box(
        zone.x + zone.width / 2,
        0.006,
        zone.z + zone.depth / 2,
        zone.width,
        0.012,
        zone.depth,
        zone.name === "화장실" ? "#cbd7ce" : "#dfc9a8",
      ),
    );
    for (let z = 0.25; z < d; z += 0.25)
      box(w / 2, 0.015, z, w, 0.003, 0.009, "#c7b290");
    wallPieces(space).forEach((p) => {
      if (
        mode === "overview" &&
        cutaway &&
        (p.x >= w - 0.05 || p.z >= d - 0.05)
      )
        return;
      box(p.x, p.y, p.z, p.width, p.height, p.depth, "#f2efe4");
    });
    if (mode === "inside") box(w / 2, h + 0.05, d / 2, w, 0.08, d, "#f6f3ec");
    space.openings.forEach((o) => {
      const wall = walls(space).find((p) => p.id === o.wallId)!;

      const x = wall.x + (wall.axis === "x" ? o.offset + o.width / 2 : 0),
        z = wall.z + (wall.axis === "z" ? o.offset + o.width / 2 : 0);
      const width = wall.axis === "x" ? o.width : 0.055,
        depth = wall.axis === "z" ? o.width : 0.055;
      if (o.kind === "window") {
        const pane = box(
          x,
          o.sill + o.height / 2,
          z,
          width,
          o.height,
          depth,
          "#a9d0ce",
        );
        (pane.material as THREE.MeshStandardMaterial).transparent = true;
        (pane.material as THREE.MeshStandardMaterial).opacity = 0.5;
        box(x, o.sill, z, width + 0.06, 0.045, depth + 0.06, "#f9f8ed");
        box(
          x,
          o.sill + o.height,
          z,
          width + 0.06,
          0.045,
          depth + 0.06,
          "#f9f8ed",
        );
        box(
          x,
          o.sill + o.height / 2,
          z,
          wall.axis === "x" ? 0.045 : 0.09,
          o.height,
          wall.axis === "z" ? 0.045 : 0.09,
          "#f9f8ed",
        );
      } else {
        for (const edge of [o.offset, o.offset + o.width])
          box(
            wall.x + (wall.axis === "x" ? edge : 0),
            o.height / 2,
            wall.z + (wall.axis === "z" ? edge : 0),
            0.055,
            o.height,
            0.055,
            "#c2ad91",
          );
        box(
          x,
          o.height + 0.025,
          z,
          width + 0.07,
          0.05,
          depth + 0.02,
          "#c2ad91",
        );
      }
    });
    space.furniture.forEach((f) => {
      const g = new THREE.Group();
      g.position.set(f.x, 0, f.z);
      g.rotation.y = (-f.rotation * Math.PI) / 180;
      scene.add(g);
      const b = (
        x: number,
        y: number,
        z: number,
        ww: number,
        hh: number,
        dd: number,
        c: string,
      ) => box(x, y, z, ww, hh, dd, c, g);
      const c = colors[f.kind];
      if (f.kind === "bed") {
        b(0, f.height * 0.35, 0, f.width, f.height * 0.7, f.depth, "#9d8268");
        b(
          0,
          f.height * 0.84,
          0,
          f.width * 0.98,
          f.height * 0.3,
          f.depth * 0.98,
          "#edece0",
        );
        b(
          0,
          f.height + 0.015,
          f.depth * 0.13,
          f.width * 0.99,
          0.035,
          f.depth * 0.65,
          c,
        );
        b(
          0,
          f.height + 0.06,
          -f.depth * 0.34,
          f.width * 0.75,
          0.12,
          f.depth * 0.18,
          "#f8f5e9",
        );
        b(
          0,
          f.height * 0.8,
          -f.depth / 2 + 0.035,
          f.width,
          f.height * 1.6,
          0.07,
          "#b49a7a",
        );
      } else if (f.kind === "desk") {
        b(0, f.height - 0.035, 0, f.width, 0.07, f.depth, c);
        for (const xx of [-1, 1])
          for (const zz of [-1, 1])
            b(
              xx * (f.width / 2 - 0.04),
              f.height / 2,
              zz * (f.depth / 2 - 0.04),
              0.045,
              f.height - 0.07,
              0.045,
              "#756c5b",
            );
        b(
          0,
          f.height + 0.16,
          -f.depth * 0.2,
          f.width * 0.45,
          0.3,
          0.035,
          "#4e5751",
        );
      } else if (f.kind === "chair") {
        b(0, f.height * 0.53, 0, f.width, 0.07, f.depth, c);
        b(
          0,
          f.height * 0.78,
          -f.depth * 0.43,
          f.width,
          f.height * 0.44,
          0.055,
          c,
        );
        for (const xx of [-1, 1])
          for (const zz of [-1, 1])
            b(
              xx * f.width * 0.38,
              f.height * 0.25,
              zz * f.depth * 0.38,
              0.03,
              f.height * 0.5,
              0.03,
              "#706c5f",
            );
      } else {
        b(0, f.height / 2, 0, f.width, f.height, f.depth, c);
        if (f.kind === "sink") {
          b(
            0,
            f.height + 0.012,
            0,
            f.width + 0.025,
            0.025,
            f.depth + 0.02,
            "#e5e3da",
          );
          b(
            -f.width * 0.15,
            f.height + 0.03,
            0,
            f.width * 0.48,
            0.02,
            f.depth * 0.6,
            "#858f89",
          );
          b(0, f.height + 0.15, -f.depth * 0.3, 0.025, 0.3, 0.025, "#b6c4c0");
        }
        if (f.kind === "washer") {
          const circle = new THREE.Mesh(
            new THREE.CylinderGeometry(f.width * 0.3, f.width * 0.3, 0.03, 32),
            new THREE.MeshStandardMaterial({
              color: "#6d8585",
              metalness: 0.3,
              roughness: 0.2,
            }),
          );
          circle.rotation.x = Math.PI / 2;
          circle.position.set(0, f.height * 0.48, f.depth / 2 + 0.02);
          g.add(circle);
        }
        if (f.kind === "wardrobe" || f.kind === "fridge") {
          b(
            0,
            f.height * 0.5,
            f.depth / 2 + 0.01,
            0.012,
            f.height * 0.85,
            0.012,
            "#96998c",
          );
          b(
            f.width * 0.12,
            f.height * 0.6,
            f.depth / 2 + 0.025,
            0.022,
            0.2,
            0.025,
            "#697366",
          );
        }
      }
    });
    let yaw = 0.7,
      pitch = 0.55;
    const zone = space.zones.find((z) => z.id === active) || space.zones[0];
    const point = zone ? viewpoint(space, zone) : { x: w / 2, z: d / 2 };
    const updateCamera = () => {
      if (mode === "overview") {
        const radius = Math.max(w, d) * 1.85;
        camera.position.set(
          w / 2 + Math.sin(yaw) * Math.cos(pitch) * radius,
          Math.sin(pitch) * radius,
          d / 2 + Math.cos(yaw) * Math.cos(pitch) * radius,
        );
        camera.lookAt(w / 2, 0.55, d / 2);
      } else {
        camera.position.set(point.x, Math.min(1.55, h - 0.3), point.z);
        camera.lookAt(
          point.x + Math.sin(yaw) * Math.cos(pitch),
          camera.position.y + Math.sin(pitch),
          point.z - Math.cos(yaw) * Math.cos(pitch),
        );
      }
    };
    if (mode === "inside") {
      yaw = 0;
      pitch = 0;
    }
    updateCamera();
    let pointer: number | null = null,
      px = 0,
      py = 0;
    const down = (e: PointerEvent) => {
      pointer = e.pointerId;
      px = e.clientX;
      py = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      yaw -= (e.clientX - px) * 0.006;
      pitch = THREE.MathUtils.clamp(
        pitch + (e.clientY - py) * 0.005,
        mode === "inside" ? -1.25 : 0.12,
        1.4,
      );
      px = e.clientX;
      py = e.clientY;
      updateCamera();
    };
    const up = () => {
      pointer = null;
    };
    const lost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const resize = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(element);
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    return () => {
      resize.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [space, active, mode, reset, cutaway]);
  async function fullscreen() {
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setFull(false);
      return;
    }
    setFull(true);
    try {
      await frame.current?.requestFullscreen?.();
    } catch {
      /* CSS fullscreen fallback remains active */
    }
  }
  return (
    <div className={`room-view ${full ? "expanded" : ""}`} ref={frame}>
      <div className="scene" ref={host} />
      {failed && (
        <div className="fallback">
          <p>이 환경에서는 3D를 지원하지 않습니다. 평면도로 둘러보세요.</p>
          <FloorPlan space={space} active={active} onSelect={onSelect} />
        </div>
      )}
      <div className="view-top">
        <span className="floating-label">
          <span className="dot" />
          {mode === "overview" ? "3D 공간 미리보기" : "360° 실내 보기"}
        </span>
        <button
          className="icon-button"
          onClick={fullscreen}
          title={full ? "전체 화면 닫기" : "전체 화면"}
          aria-label={full ? "전체 화면 닫기" : "전체 화면"}
        >
          {full ? <Minimize size={17} /> : <Expand size={17} />}
        </button>
      </div>
      {mode === "overview" && (
        <button
          className="wall-toggle"
          aria-pressed={cutaway}
          onClick={() => setCutaway((v) => !v)}
        >
          {cutaway ? "벽 전체 표시" : "앞쪽 벽 숨기기"}
        </button>
      )}
      <div className="view-bottom">
        <div className="segmented">
          <button
            className={mode === "overview" ? "selected" : ""}
            onClick={() => setMode("overview")}
          >
            <Box size={15} />
            전체 공간
          </button>
          <button
            className={mode === "inside" ? "selected" : ""}
            onClick={() => setMode("inside")}
          >
            <Move size={15} />
            실내 둘러보기
          </button>
        </div>
        <button
          className="icon-button"
          onClick={() => setReset((n) => n + 1)}
          aria-label="시선 초기화"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="drag-hint">
        추정 3D 모델 · 드래그하여 시선을 돌려보세요
      </div>
      {full && (
        <div className="full-spaces">
          {displayZones(space).map((z) => (
            <button
              key={z.id}
              className={active === z.id ? "active" : ""}
              onClick={() => {
                onSelect(z.id);
                setMode("inside");
              }}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}
      {full && (
        <p className="full-warning">
          사진과 면적을 바탕으로 추정한 공간이며 실제 구조·치수와 다를 수
          있습니다
        </p>
      )}
    </div>
  );
}
