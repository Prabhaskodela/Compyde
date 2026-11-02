export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export async function streamGemini({ apiKey, contents, onText, signal, model = DEFAULT_GEMINI_MODEL }) {
  if (!apiKey?.trim()) throw new Error("Add your Gemini API key in Assistant settings.");

  let response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
      body: JSON.stringify({ contents }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Could not reach Gemini. Check your network and try again.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.error?.message;
    if (response.status === 400) throw new Error(detail || "Gemini rejected the request. Check the prompt, model, and API key restrictions.");
    if (response.status === 401 || response.status === 403) throw new Error("Gemini rejected this key. Check that it is valid and enabled for the Gemini API.");
    if (response.status === 429) throw new Error("Gemini rate limit or free-tier quota reached. Wait and try again, or check your Google AI Studio usage.");
    throw new Error(detail || `Gemini returned HTTP ${response.status}. Try again later.`);
  }
  if (!response.body) throw new Error("Gemini returned no response stream. Try again.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedText = false;
  const consume = (event) => {
    const data = event.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
    if (!data || data === "[DONE]") return;
    let chunk;
    try { chunk = JSON.parse(data); }
    catch { throw new Error("Gemini sent an unreadable response. Please retry."); }
    if (chunk.error) throw new Error(chunk.error.message || "Gemini could not complete this request.");
    for (const part of chunk.candidates?.[0]?.content?.parts || []) {
      if (typeof part.text === "string" && part.text) {
        receivedText = true;
        onText(part.text);
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";
      for (const event of events) consume(event);
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
  } catch (error) {
    if (signal?.aborted || error.name === "AbortError") throw new DOMException("Generation stopped.", "AbortError");
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!receivedText) throw new Error("Gemini returned no text. Check the selected model and try again.");
}
