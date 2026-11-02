import { CreateMLCEngine } from "@mlc-ai/web-llm";
let engine;
self.onmessage = async ({ data }) => {
  const { type, id } = data;
  try {
    if (type === "load") {
      engine = await CreateMLCEngine(data.model, { initProgressCallback: (p) => self.postMessage({ type:"progress", id, progress:p.progress, text:p.text }) });
      self.postMessage({ type:"ready", id });
    }
    if (type === "generate") {
      const result = await engine.chat.completions.create({ messages:data.messages, stream:true, temperature:0.7 });
      for await (const part of result) self.postMessage({ type:"chunk", id, text:part.choices[0]?.delta?.content || "" });
      self.postMessage({ type:"done", id });
    }
    if (type === "stop" && engine) await engine.interruptGenerate();
    if (type === "unload" && engine) { await engine.unload(); engine=null; self.postMessage({type:"unloaded",id}); }
  } catch (error) { self.postMessage({ type:"error", id, message:error?.message || "Local model failed." }); }
};
