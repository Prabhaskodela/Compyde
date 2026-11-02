import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/src/index.js";

const env={GEMINI_API_KEY:"test-only",ALLOWED_ORIGINS:"https://example.test"};
function req(body,{origin="https://example.test",method="POST",type="application/json",ip="198.51.100.10"}={}){return new Request("https://worker.test/",{method,headers:{Origin:origin,"Content-Type":type,"CF-Connecting-IP":ip},body:method==="POST"?body:undefined})}

test("rejects an unapproved origin",async()=>{const res=await worker.fetch(req(JSON.stringify({contents:[]}),{origin:"https://evil.test"}),env);assert.equal(res.status,403)});
test("rejects non JSON request content",async()=>{const res=await worker.fetch(req("hello",{type:"text/plain"}),env);assert.equal(res.status,415)});
test("validates conversation shape before contacting Gemini",async()=>{const res=await worker.fetch(req(JSON.stringify({contents:[{role:"system",parts:[{text:"bad"}]}]})),env);assert.equal(res.status,400)});
test("streams Gemini text and maps quota errors to an actionable message",async t=>{const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);globalThis.fetch=async()=>new Response('data: {"candidates":[{"content":{"parts":[{"text":"Hello from Gemini"}]}}]}\n\n',{headers:{"Content-Type":"text/event-stream"}});const response=await worker.fetch(req(JSON.stringify({contents:[{role:"user",parts:[{text:"Hi"}]}]}),{ip:"198.51.100.11"}),env);assert.equal(response.status,200);assert.match(await response.text(),/Hello from Gemini/);globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:"quota"}}),{status:429,headers:{"Content-Type":"application/json"}});const limited=await worker.fetch(req(JSON.stringify({contents:[{role:"user",parts:[{text:"Hi"}]}]}),{ip:"198.51.100.12"}),env);assert.equal(limited.status,429);assert.match((await limited.json()).error,/quota/i)});

