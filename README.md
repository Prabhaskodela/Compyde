# COMPYDE

**Code. Learn. Solve.** A browser-first programming workspace with two products: Compiler Hub and Smart Assistant.

## What works

- Responsive landing page and light/dark theme.
- Smart Assistant with explicitly selectable Local AI and Cloud AI modes.
- IndexedDB is not required for chat persistence in this first release; conversations are stored in browser LocalStorage and can be searched, removed, or cleared. Browser data is device-specific and can be removed by browser cleanup.
- Local AI runs WebLLM in a Web Worker using WebGPU. It loads only after you choose **Download & load model**. The model cache is controlled by the browser/WebLLM; use Unload to release runtime resources. Availability depends on browser, GPU, and memory. The first download may be several GB.
- Cloud AI streams Gemini output through a Cloudflare Worker. The API key is a Worker secret. Set the Worker URL in Assistant settings. Cloud requests may use Gemini quota; the app does not select a paid model automatically.
- JPG, PNG and WEBP image attachments are supported in Cloud mode. PDFs use PDF.js text extraction (up to 20 pages) in either mode; scanned pages need OCR and are not understood as images in Local AI.
- Compiler Hub executes browser JavaScript in a sandboxed iframe, HTML in a sandboxed preview, Python via Pyodide and SQL via SQLite WebAssembly. C/C++/Java are labeled unavailable; no fake compiler result is produced.
- Export is not implemented in this release. Chats can be cleared individually or together.

## Architecture

Vite bundles the static frontend for GitHub Pages. The assistant uses a common message format, while the router sends requests only to the selected mode. A Web Worker hosts WebLLM inference; the separate Cloudflare Worker validates and streams Gemini requests. The Worker never logs prompt or file content. It uses an in-memory per-IP throttle; production deployments should also configure Cloudflare rate limiting and strict `ALLOWED_ORIGINS`.

## Requirements

- Node.js 20.19+ or 22.12+.
- A current Chromium-based browser and a WebGPU-compatible device for Local AI. This cannot guarantee every GPU has enough memory.
- Cloudflare account and Gemini API key only if you want Cloud AI.

## Run locally

1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Open this folder in VS Code.
3. In a terminal, run `npm install`, then `npm run dev`.
4. Open the local URL printed by Vite.

## Configure Cloud AI securely

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey). Review current free-tier availability, quotas, data terms, and model status in Google’s documentation before use.
2. Install Wrangler: `npm install --global wrangler`, then run `wrangler login`.
3. In the `worker` directory, set the secret: `wrangler secret put GEMINI_API_KEY`. Paste the key only into the Wrangler prompt. Never add it to frontend settings, `.env`, source control, or chat history.
4. Set `GEMINI_MODEL` in `worker/wrangler.toml` to a currently available model for your account. The default is `gemini-3.5-flash-lite`; model and free-tier access can change.
5. Set `ALLOWED_ORIGINS` to your exact site origin(s), then deploy with `wrangler deploy` from `worker`.
6. Copy the Worker URL into Assistant → settings → Cloud AI connection.
7. Configure Cloudflare rate limiting and usage controls before making the site public. The included Worker throttle is basic and per-isolate, not a distributed abuse shield.

Gemini model availability and quotas change. Check [official model documentation](https://ai.google.dev/gemini-api/docs/models) and [image understanding](https://ai.google.dev/gemini-api/docs/image-understanding). Cloudflare Worker request budgets may also apply.

## Deploy the frontend to GitHub Pages

1. Set the Vite base path to your repository path if using a project site, for example `/Compyde/` in `vite.config.js`.
2. Run `npm run build`.
3. Publish the generated `dist/` directory with GitHub Pages (or add a Pages workflow that builds the project).
4. Add the resulting GitHub Pages origin to Worker `ALLOWED_ORIGINS`, then redeploy the Worker.

The repository includes a GitHub Actions workflow that installs dependencies, builds Vite, and publishes `dist/` on pushes to `main`.

## Local AI troubleshooting

- If WebGPU is missing, use a supported up-to-date browser and check browser hardware acceleration and graphics driver settings. Local mode will show an error; it will never route the prompt to Gemini.
- A failed or interrupted model download can be retried by selecting the model again. Browser cache eviction and device storage limits are outside the app’s control.
- If initialization fails or memory runs out, reload the page, close other GPU-heavy tabs, and select the smallest listed model. Not all listed models will fit all devices.
- Model choices come from WebLLM’s model registry; check the current [WebLLM docs](https://webllm.mlc.ai/docs/) before changing the pinned WebLLM package or model IDs.

## Privacy notes

Local inference sends prompts to the in-browser model only. The initial model files come from WebLLM’s model host. Cloud mode sends prompt contents and attached image data to your Worker, then Gemini. PDF content is extracted in the browser and sent as text to the selected AI mode. No analytics are included. Chat history is stored in this browser and is not synchronized.

## Current limits

Local image understanding is not included. OCR for images/scanned PDFs, IndexedDB migration, chat export, edit prompt, stop-generation UI, and a sandboxed interactive HTML preview are follow-up work. Local PDF extraction is text-only and capped at 20 pages/50,000 characters. Python and SQL libraries are loaded on demand and require network access the first time.

