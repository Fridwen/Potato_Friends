import { test } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { analyzeImages } from "../lib/analyze";
import { readInput, InputError, MAX_BODY_BYTES } from "../lib/upload";
import { example } from "../lib/example";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6XhQAAAAASUVORK5CYII=",
  "base64",
);
function request(count = 1, area = "20", fake = false, planCount = 1) {
  const f = new FormData();
  f.append("area", area);
  for (let i = 0; i < planCount; i++)
    f.append("floorPlan", new File([png], "plan.png", { type: "image/png" }));
  for (let i = 0; i < count; i++)
    f.append(
      "photos",
      new File([fake ? "not a photo" : png], "room.png", { type: "image/png" }),
    );
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: f,
  });
}
test("multipart photos and area decoded without disk storage", async () => {
  const result = await readInput(request(6, "25"));
  assert.equal(result.area, 25);
  assert.equal(result.images.length, 7);
  assert.ok(result.images.every((i) => i.startsWith("data:image/png;base64,")));
});
test("reject missing photos, too many photos, bad area, spoofed image MIME", async () => {
  for (const req of [
    request(1, "20", false, 2),
    request(0, "20", false, 0),
    request(7),
    request(1, "-20"),
    request(1, "NaN"),
    request(1, "20", true),
  ])
    await assert.rejects(() => readInput(req), InputError);
});
test("request body size guard rejects before reading huge body", async () => {
  const req = new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: {
      "content-length": String(MAX_BODY_BYTES + 1),
      "content-type": "multipart/form-data",
    },
    body: "x",
  });
  await assert.rejects(
    () => readInput(req),
    (e) => e instanceof InputError && e.status === 413,
  );
});
test("OpenAI SDK sends images with strict JSON schema and normalizes mocked response", async () => {
  let seen: Record<string, any> = {};
  const client = new OpenAI({
    apiKey: "test-only-placeholder",
    fetch: async (_url, init) => {
      seen = JSON.parse(init!.body as string);
      return new Response(
        JSON.stringify({
          id: "resp_test",
          object: "response",
          created_at: 0,
          status: "completed",
          output: [
            {
              id: "msg_test",
              type: "message",
              role: "assistant",
              status: "completed",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify(example),
                  annotations: [],
                },
              ],
            },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      );
    },
  });
  const space = await analyzeImages(
    ["data:image/png;base64," + png.toString("base64")],
    30,
    client,
  );
  assert.match(seen.instructions, /PLAN FIRST/);
  assert.match(seen.input[0].content[0].text, /평면도는 없습니다/);
  assert.equal(seen.model, "gpt-6-astra");
  assert.equal(seen.reasoning.effort, "low");
  assert.equal(seen.max_output_tokens, 24000);
  assert.equal(seen.store, false);
  assert.equal(seen.text.format.strict, true);
  assert.equal(seen.text.format.type, "json_schema");
  assert.equal(seen.input[0].content[1].type, "input_image");
  assert.ok(Math.abs(space.shell.width * space.shell.depth - 24) < 1e-8);
});
test("OpenAI refusal and incomplete output do not become fabricated results", async () => {
  for (const status of ["completed", "incomplete"]) {
    const client = new OpenAI({
      apiKey: "test-only-placeholder",
      fetch: async () =>
        new Response(
          JSON.stringify({
            id: "resp_test",
            object: "response",
            created_at: 0,
            status,
            output: [
              {
                id: "msg_test",
                type: "message",
                role: "assistant",
                status: "completed",
                content: [{ type: "refusal", refusal: "Cannot analyze image" }],
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
    });
    await assert.rejects(() =>
      analyzeImages(["data:image/png;base64,x"], 20, client),
    );
  }
});
test("same-origin browser POST works behind a differently bound Next.js server", async () => {
  const { POST } = await import("../app/api/analyze/route");
  const req = request();
  const bytes = await req.arrayBuffer();
  const local = new Request("http://0.0.0.0:3000/api/analyze", {
    method: "POST",
    body: bytes,
    headers: {
      "content-type": req.headers.get("content-type")!,
      origin: "http://localhost:3000",
      host: "localhost:3000",
    },
  });
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const res = await POST(local);
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /OPENAI_API_KEY/);
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});
test("cross-origin API requests are rejected", async () => {
  const { POST } = await import("../app/api/analyze/route");
  const req = new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { origin: "https://other.example", host: "localhost:3000" },
    body: "x",
  });
  assert.equal((await POST(req)).status, 403);
});

test("floor plan is optional and presence is explicit", async () => {
  const photos = await readInput(request(1, "20", false, 0));
  assert.equal(photos.hasFloorPlan, false);
  assert.equal(photos.images.length, 1);
  const plan = await readInput(request());
  assert.equal(plan.hasFloorPlan, true);
  assert.equal(plan.images.length, 2);
});

test("floor plan alone is accepted without interior photos", async () => {
  const result = await readInput(request(0));
  assert.equal(result.hasFloorPlan, true);
  assert.equal(result.images.length, 1);
});
