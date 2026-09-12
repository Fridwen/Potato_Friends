"use client";
import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ArrowRight,
  Upload,
  Plus,
  X,
  Layers,
  ScanLine,
  House,
  Check,
  Info,
  Download,
  ChevronDown,
  ImageIcon,
  LoaderCircle,
} from "lucide-react";
import FloorPlan from "@/components/FloorPlan";
import { demoSpace, loftDemoSpace } from "@/lib/example";
import { Space, displayZones } from "@/lib/space";
const RoomView = dynamic(() => import("@/components/RoomView"), {
  ssr: false,
  loading: () => (
    <div className="view-loading">
      <LoaderCircle className="spin" />
      3D 공간 불러오는 중
    </div>
  ),
});
type Photo = { file: File; url: string };
export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]),
    [floorPlan, setFloorPlan] = useState<Photo | null>(null),
    [area, setArea] = useState("20"),
    [space, setSpace] = useState<Space>(demoSpace),
    [active, setActive] = useState("living"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [isDemo, setDemo] = useState(true),
    [elapsed, setElapsed] = useState(0),
    [resultTime, setResultTime] = useState<{
      seconds: number;
      cached: boolean;
    } | null>(null),
    [drag, setDrag] = useState(false),
    [sourcePhotos, setSourcePhotos] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const owned = useRef(new Set<string>());
  useEffect(
    () => () => {
      owned.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, [busy]);
  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    setError("");
    const list = Array.from(files);
    if (photos.length + list.length > 6) {
      setError("사진은 최대 6장까지 선택할 수 있어요.");
      return;
    }
    if (
      list.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 8 * 1024 * 1024,
      )
    ) {
      setError("8MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.");
      return;
    }
    setPhotos((p) => [
      ...p,
      ...list.map((file) => {
        const url = URL.createObjectURL(file);
        owned.current.add(url);
        return { file, url };
      }),
    ]);
  }
  function addPlan(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("평면도는 8MB 이하의 JPG, PNG, WebP 이미지로 올려 주세요.");
      return;
    }
    const url = URL.createObjectURL(file);
    owned.current.add(url);
    setFloorPlan({ file, url });
    setError("");
  }
  async function generate(force = false) {
    setError("");
    const n = Number(area);
    if (!floorPlan && !photos.length) {
      setError("평면도 또는 실내 사진을 1장 이상 선택해 주세요.");
      return;
    }
    if (!Number.isFinite(n) || n < 8 || n > 80) {
      setError("전용면적은 8~80㎡로 입력해 주세요.");
      return;
    }
    setBusy(true);
    setElapsed(0);
    try {
      const body = new FormData();
      if (floorPlan) body.append("floorPlan", floorPlan.file);
      photos.forEach((p) => body.append("photos", p.file));
      body.append("area", area);
      if (force) body.append("force", "true");
      const res = await fetch("/api/analyze", {
        method: "POST",
        body,
        signal: AbortSignal.timeout(270000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석에 실패했습니다.");
      setSpace(data.space);
      setResultTime({
        seconds: (data.durationMs ?? 0) / 1000,
        cached: !!data.cached,
      });
      setActive(displayZones(data.space)[0]?.id || "");
      setSourcePhotos([
        ...(floorPlan ? [floorPlan.url] : []),
        ...photos.map((p) => p.url),
      ]);
      setDemo(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.name === "TimeoutError"
            ? "분석 시간이 초과되었습니다. 사진 수를 줄여 다시 시도해 주세요."
            : e.message
          : "분석 중 오류가 발생했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  function showLoftDemo() {
    setSpace(loftDemoSpace);
    setActive("loft");
    setDemo(true);
    setResultTime(null);
    setSourcePhotos([]);
    setError("");
  }
  function demo() {
    setSpace(demoSpace);
    setActive("living");
    setDemo(true);
    setResultTime(null);
    setSourcePhotos([]);
    setError("");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(space, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "viewliet-space.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <header>
        <a href="/" className="brand">
          <span className="brand-icon">
            <House size={21} />
          </span>
          Viewliet
        </a>
        <span className="nav-caption">사진 몇 장으로, 공간을 더 가까이</span>
        <button className="text-button" onClick={demo} disabled={busy}>
          예시 공간 둘러보기 <ArrowUpRight size={16} />
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span className="dot" /> 내 방을 찾는 새로운 시선
            </div>
            <h1>
              사진 너머의 공간을
              <br />
              <span>직접 둘러보세요.</span>
            </h1>
            <p>
              평면도 또는 원룸 사진과 전용면적을 넣어 주세요.
              <br />
              평면도부터 360° 실내 보기까지, 나에게 맞는 방인지 살펴보세요.
            </p>
          </div>
          <div className="intro-note">
            <div className="note-graphic">
              <Layers size={30} strokeWidth={1.2} />
            </div>
            <span>작은 방도, 입체적으로.</span>
            <small>대학생을 위한 원룸 공간 미리보기</small>
          </div>
        </section>
        <div className="workspace">
          <aside className="input-panel">
            <div className="panel-title">
              <span className="step">01</span>
              <h2>어떤 공간인가요?</h2>
            </div>
            <p className="subtext">
              평면도만으로도 만들 수 있어요. 실내 사진을 더하면 가구 배치를
              참고해요.
            </p>
            <div className="field-heading">
              <label htmlFor="floor-plan">
                평면도 <strong>선택</strong>
              </label>
              <span>1장 · 이미지</span>
            </div>
            <input
              id="floor-plan"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                addPlan(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <p className="subtext">
              벽·문·창문과 치수가 잘 보이는 평면도를 올려 주세요. JPG, PNG, WebP
              · 최대 8MB
            </p>
            {floorPlan && (
              <div className="photo-grid">
                <div>
                  <img src={floorPlan.url} alt="업로드한 선택 평면도" />
                  <span>평면도 · 1</span>
                  <button
                    disabled={busy}
                    aria-label="평면도 삭제"
                    onClick={() => setFloorPlan(null)}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <div className="field-heading">
              <label htmlFor="photos">
                원룸 사진 {floorPlan ? "(선택)" : ""}
              </label>
              <span>{photos.length} / 6장</span>
            </div>
            <input
              id="photos"
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              disabled={busy}
              className={`upload ${drag ? "dragging" : ""}`}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!busy) addFiles(e.dataTransfer.files);
              }}
            >
              <span className="upload-icon">
                <Upload size={23} strokeWidth={1.5} />
              </span>
              <strong>사진을 끌어다 놓거나 선택하세요</strong>
              <span>방 · 주방 · 욕실, 다양한 각도일수록 좋아요</span>
              <small>JPG, PNG, WebP · 장당 최대 8MB</small>
              <span className="choose">
                <Plus size={14} /> 사진 선택
              </span>
            </button>
            {photos.length > 0 && (
              <div className="photo-grid">
                {photos.map((p, i) => (
                  <div key={p.url}>
                    <img src={p.url} alt={`업로드 원본 사진 ${i + 1}`} />
                    <span>{i + (floorPlan ? 2 : 1)}</span>
                    <button
                      disabled={busy}
                      aria-label={`사진 ${i + 1} 삭제`}
                      onClick={() =>
                        setPhotos((ps) => ps.filter((q) => q.url !== p.url))
                      }
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="text-button"
              onClick={showLoftDemo}
              disabled={busy}
            >
              복층 예시 체험
            </button>
            <div className="area-field">
              <label htmlFor="area">전용면적</label>
              <div className="number-input">
                <input
                  id="area"
                  type="number"
                  min="8"
                  max="80"
                  step="0.1"
                  value={area}
                  disabled={busy}
                  onChange={(e) => setArea(e.target.value)}
                />
                <span>㎡</span>
              </div>
              <small>
                욕실·주방을 포함한 전체 실내 면적을 입력해 주세요. 추정 면적은
                입력값보다 최대 20% 작을 수 있어요.
              </small>
            </div>
            <button
              className="primary"
              onClick={() => generate()}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <ScanLine size={18} />
              )}{" "}
              {busy ? "공간을 만들고 있어요" : "공간 만들기"}{" "}
              {!busy && <ArrowRight size={17} />}
            </button>
            {resultTime && (
              <button
                className="text-button"
                disabled={busy || (!floorPlan && !photos.length)}
                onClick={() => generate(true)}
              >
                결과 재사용 없이 새로 분석
              </button>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {busy && (
              <div role="status" className="progress">
                <div className="current">
                  <LoaderCircle size={13} className="spin" />
                  사진 분석과 공간 배치 중 · {elapsed}초
                </div>
                <div>완료되면 면적·좌표 검증 후 표시합니다.</div>
              </div>
            )}
            <p className="privacy">
              분석 시 사진이 OpenAI로 전송됩니다.
              <br />
              앱은 사진을 저장하지 않아요. 분석 결과는 5분간 임시 재사용합니다.
            </p>
            <div className="tip">
              <Info size={16} />
              <div>
                <strong>처음이라면 가볍게 둘러보세요</strong>
                <p>사진 없이도 20㎡ 예시 공간을 체험할 수 있어요.</p>
                <button onClick={demo} disabled={busy}>
                  예시 공간 열기 <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </aside>
          <section className="results" aria-busy={busy}>
            <div className="results-heading">
              <div>
                <div className="eyebrow">YOUR SPACE, REIMAGINED</div>
                <h2>
                  {isDemo
                    ? "햇살이 머무는 20㎡ 원룸"
                    : "평면도와 사진으로 만든 나의 원룸"}{" "}
                  <span className="result-badge">
                    {isDemo ? "예시 공간" : "분석 완료"}
                  </span>
                </h2>
              </div>
              <button
                className="icon-button export"
                onClick={download}
                title="최종 JSON 다운로드"
                aria-label="최종 JSON 다운로드"
              >
                <Download size={17} />
              </button>
            </div>
            {!isDemo && resultTime && (
              <p className="analysis-timing">
                {resultTime.cached
                  ? "동일 사진·면적의 최근 결과 재사용"
                  : "분석 완료"}{" "}
                · 서버 처리 {resultTime.seconds.toFixed(1)}초
              </p>
            )}
            <div className="metrics">
              <span>
                <strong>{space.area.toFixed(1)}</strong> ㎡ 입력 전용면적
              </span>
              <i />
              <span>
                <strong>
                  {(space.shell.width * space.shell.depth).toFixed(1)}
                </strong>{" "}
                ㎡ 추정 면적
              </span>
              <i />
              <span>
                <strong>{space.shell.height.toFixed(1)}</strong> m 추정 층고
              </span>
              <i />
              <span>
                <strong>{space.furniture.length}</strong> 개 가구 · 설비
              </span>
              <span className="verified">
                <Check size={13} /> 면적·좌표 보정 완료
              </span>
            </div>
            <div className="visual-grid">
              <article className="plan-card">
                <div className="card-heading">
                  <h3>
                    <Layers size={16} /> 2D 평면도
                  </h3>
                  <span>단위 m</span>
                </div>
                <FloorPlan space={space} active={active} onSelect={setActive} />
                <div className="plan-legend">
                  <span>
                    <b />
                    가구 · 설비
                  </span>
                  <span>
                    <b />
                    현재 시점
                  </span>
                </div>
              </article>
              <article className="three-card">
                <RoomView space={space} active={active} onSelect={setActive} />
              </article>
            </div>
            {space.loft && (
              <div className="loft-levels">
                <button
                  onClick={() =>
                    setActive(displayZones(space)[0]?.id || "ground")
                  }
                  aria-pressed={active !== "loft"}
                >
                  아래층
                </button>
                <button
                  onClick={() => setActive("loft")}
                  aria-pressed={active === "loft"}
                >
                  복층
                </button>
                <span>
                  복층 {(space.loft.width * space.loft.depth).toFixed(1)}㎡ ·
                  바닥 높이 {space.loft.elevation.toFixed(1)}m · 면적 별도
                </span>
              </div>
            )}
            <div className="space-nav">
              <span>공간 이동</span>
              {displayZones(space).map((z) => (
                <button
                  key={z.id}
                  className={active === z.id ? "active" : ""}
                  onClick={() => setActive(z.id)}
                >
                  <span className="tiny-dot" />
                  {z.name}
                </button>
              ))}
            </div>
            {!isDemo && (
              <p className="evidence-policy">
                평면도 또는 사진에서 확인한 구조·가구를 표시합니다. 확인되지
                않은 영역은 비워 두며, 외곽과 치수는 추정값입니다.
              </p>
            )}
            <div className="notice">
              <Info size={16} />
              <p>
                사진과 면적을 바탕으로 추정한 공간이며 실제 구조·치수와 다를 수
                있습니다
              </p>
            </div>
            <details className="assumptions">
              <summary>
                <span>
                  <ScanLine size={17} /> 치수 추정 · 표시하지 않은 내용{" "}
                  <small>{space.assumptions.length}개</small>
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="details-body">
                <ul>
                  {space.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                <h4>검증 및 보정</h4>
                <ul>
                  {space.corrections.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                <h4>항목별 근거</h4>
                <div className="evidence-list">
                  {[
                    { name: "외곽 · 천장", evidence: space.shell.evidence },
                    ...displayZones(space),
                    ...(space.loft
                      ? [
                          { name: "복층", evidence: space.loft.evidence },
                          {
                            name: "복층 계단",
                            evidence: space.loft.stairs.evidence,
                          },
                        ]
                      : []),
                    ...space.partitions.map((p) => ({
                      ...p,
                      name: `칸막이 ${p.id}`,
                    })),
                    ...space.openings.map((o) => ({
                      ...o,
                      name: o.kind === "door" ? "문" : "창문",
                    })),
                    ...space.furniture,
                    ...space.connections.map((c) => ({
                      ...c,
                      name: `공간 연결 ${c.from} → ${c.to}`,
                    })),
                  ].map((item, i) => (
                    <div key={i}>
                      <strong>{item.name}</strong>
                      <span
                        className={
                          item.evidence.source === "observed"
                            ? "observed"
                            : "inferred"
                        }
                      >
                        {item.evidence.source === "observed"
                          ? `이미지 ${item.evidence.photos.join(", ")}에서 관찰`
                          : "추정"}
                      </span>
                      <p>{item.evidence.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
            <details className="assumptions">
              <summary>
                <span>
                  <ImageIcon size={17} /> 원본 평면도·사진{" "}
                  <small>
                    {isDemo
                      ? "예시 데이터 · 원본 없음"
                      : `${sourcePhotos.length}장`}
                  </small>
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="source-photos">
                {sourcePhotos.length ? (
                  sourcePhotos.map((url, i) => (
                    <a href={url} key={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`분석에 사용한 원본 ${i + 1}`} />
                    </a>
                  ))
                ) : (
                  <p>
                    현재 공간은 예시 JSON으로 생성되었습니다. 사진을 업로드하면
                    이곳에서 분석에 사용한 원본을 확인할 수 있어요.
                  </p>
                )}
              </div>
            </details>
          </section>
        </div>
        <footer>
          <span className="brand-small">Viewliet</span>
          <span>내 공간을 만나기 전, 한 번 더 둘러보기.</span>
          <span>VIEWLIET · YOUR SPACE IN VIEW</span>
        </footer>
      </main>
    </>
  );
}
