export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_BODY_BYTES = 57 * 1024 * 1024;
export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function imageType(bytes: Uint8Array): string | null {
  if (
    bytes.length > 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    bytes.length > 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "image/png";
  if (
    bytes.length > 12 &&
    Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.slice(8, 12)).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function readInput(request: Request) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BODY_BYTES)
    throw new InputError("사진 전체 크기가 너무 큽니다.", 413);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new InputError("사진 업로드 형식이 올바르지 않습니다.");
  if (!request.body) throw new InputError("사진이 없습니다.");
  // Enforce streamed byte limit even when content-length is missing or incorrect.
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new InputError("사진 전체 크기가 너무 큽니다.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new InputError("사진 업로드 데이터를 읽을 수 없습니다.");
  }
  const area = Number(form.get("area"));
  if (!Number.isFinite(area) || area < 8 || area > 80)
    throw new InputError("전용면적은 8~80㎡로 입력해 주세요.");
  const files = form.getAll("photos");
  if (files.length > 6 || files.some((f) => !(f instanceof File)))
    throw new InputError("실내 사진은 최대 6장까지 업로드해 주세요.");
  const plans = form.getAll("floorPlan");
  if (plans.length > 1 || plans.some((p) => !(p instanceof File)))
    throw new InputError("평면도 이미지는 최대 1장까지 업로드해 주세요.");
  if (!plans.length && !files.length)
    throw new InputError("평면도 또는 실내 사진을 1장 이상 업로드해 주세요.");
  const images = [];
  for (const file of [...plans, ...files] as File[]) {
    if (!file.size || file.size > MAX_FILE_BYTES)
      throw new InputError("사진은 장당 8MB 이하여야 합니다.", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = imageType(bytes);
    if (!mime || file.type !== mime)
      throw new InputError(
        "실제 JPG, PNG, WebP 이미지 파일만 사용할 수 있습니다.",
      );
    images.push(`data:${mime};base64,${Buffer.from(bytes).toString("base64")}`);
  }
  return {
    area,
    images,
    hasFloorPlan: plans.length === 1,
    force: form.get("force") === "true",
  };
}
