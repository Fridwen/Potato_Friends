import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ZodError } from "zod";
import { readInput, InputError } from "@/lib/upload";
import { analysisCache, analysisKey } from "@/lib/analysis-cache";
import { analyzeImages, ANALYSIS_REVISION } from "@/lib/analyze";
export const runtime = "nodejs";
export const maxDuration = 300;
let inFlight = 0;
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return json({ error: "잘못된 요청 출처입니다." }, 403);
    }
    if (
      originHost !== (request.headers.get("host") || new URL(request.url).host)
    )
      return json({ error: "동일한 사이트에서 요청해 주세요." }, 403);
  }
  if (inFlight >= 2)
    return json(
      { error: "현재 분석 중인 요청이 많습니다. 잠시 후 다시 시도해 주세요." },
      429,
    );
  const started = Date.now();
  inFlight++;
  try {
    const { area, images, hasFloorPlan, force } = await readInput(request);
    const key = process.env.OPENAI_API_KEY;
    if (!key)
      return json(
        {
          error:
            "서버에 OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 설정한 뒤 서버를 다시 실행해 주세요. 예시 공간은 바로 체험할 수 있습니다.",
        },
        503,
      );
    const client = new OpenAI({ apiKey: key, timeout: 240000, maxRetries: 0 });
    const result = await analysisCache.run(
      analysisKey(images, area, key, `${ANALYSIS_REVISION}:${hasFloorPlan}`),
      () => analyzeImages(images, area, client, hasFloorPlan),
      force,
    );
    return json({ ...result, durationMs: Date.now() - started });
  } catch (error) {
    if (error instanceof InputError)
      return json({ error: error.message }, error.status);
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401 || error.status === 403)
        return json(
          { error: "OpenAI API 키 또는 모델 사용 권한을 확인해 주세요." },
          502,
        );
      if (error.status === 429)
        return json(
          {
            error:
              "OpenAI 사용 한도에 도달했습니다. 결제·사용 한도를 확인하거나 잠시 후 다시 시도해 주세요.",
          },
          429,
        );
      if (error.status === 400)
        return json(
          {
            error:
              "사진을 분석할 수 없습니다. 올바른 실내 사진으로 다시 시도해 주세요.",
          },
          422,
        );
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError)
      return json(
        {
          error:
            "사진 분석 시간이 초과되었습니다. 사진 수를 줄여 다시 시도해 주세요.",
        },
        504,
      );
    if (error instanceof ZodError || error instanceof SyntaxError)
      return json(
        {
          error:
            "분석 응답의 공간 데이터가 올바르지 않습니다. 다시 시도해 주세요.",
        },
        502,
      );
    if (error instanceof Error && error.message === "NO_SPACE")
      return json(
        {
          error:
            "평면도와 실내 공간을 분석할 수 없습니다. 구조가 선명한 평면도 이미지와 같은 집의 실내 사진을 선택해 주세요.",
        },
        422,
      );
    return json(
      { error: "공간 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      502,
    );
  } finally {
    inFlight--;
  }
}
