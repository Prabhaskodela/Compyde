import test from "node:test";
import assert from "node:assert/strict";
import { streamGemini, DEFAULT_GEMINI_MODEL } from "../src/services/gemini.js";

const response = text => `data: ${JSON.stringify({candidates:[{content:{parts:[{text}]}}]})}\n\n`;

test("streams Gemini text when an SSE event is split across chunks", async t => {
  const original = globalThis.fetch;
  t.after(() => globalThis.fetch = original);
  let request;
  const wire = response("Hello ") + response("Gemini");
  globalThis.fetch = async (url, options) => {
    request = {url:String(url),options};
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(wire.slice(0, 19)));
        controller.enqueue(encoder.encode(wire.slice(19, 56)));
        controller.enqueue(encoder.encode(wire.slice(56)));
        controller.close();
      }
    }), {headers:{"Content-Type":"text/event-stream"}});
  };
  let output = "";
  await streamGemini({apiKey:"test-key",contents:[{role:"user",parts:[{text:"Hi"}]}],onText:t=>output+=t});
  assert.equal(output,"Hello Gemini");
  assert.match(request.url, new RegExp(`models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent`));
  assert.equal(request.options.headers["x-goog-api-key"],"test-key");
});

test("gives an actionable quota message for HTTP 429", async t => {
  const original = globalThis.fetch;
  t.after(() => globalThis.fetch = original);
  globalThis.fetch = async () => new Response(JSON.stringify({error:{message:"quota"}}),{status:429});
  await assert.rejects(streamGemini({apiKey:"test-key",contents:[],onText:()=>{}}),/quota/i);
});

test("requires a key before making a request", async () => {
  await assert.rejects(streamGemini({apiKey:"",contents:[],onText:()=>{}}),/API key/i);
});

