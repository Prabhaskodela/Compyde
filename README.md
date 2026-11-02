# COMPYDE

**Code. Learn. Solve.** COMPYDE is a browser-first programming workspace for students, with exactly two products: Compiler Hub and Smart Assistant.

## Features

- Responsive home and workspace with persistent light/dark theme.
- Smart Assistant offers explicitly selected Local AI and Cloud AI. Both share chat history and interface; the app never switches modes automatically.
- Conversations are stored in browser IndexedDB, with migration from older LocalStorage history, search, edit last prompt, regenerate, stop generation, per-chat deletion, JSON export, and clear-all controls. Browser data stays on this device and can be removed when browser data is cleared.
- Local AI runs WebLLM in a Web Worker with WebGPU. It loads only after you choose a model and start loading it. The model cache is managed by WebLLM; the settings panel offers load, unload and cache deletion. Model downloads can be several GB and availability depends on browser, GPU and memory. Local prompts are not sent to Gemini.
- Cloud AI streams Gemini output through a Cloudflare Worker. Its API key is a Worker secret. Set the Worker URL in Assistant settings. Provider quotas can limit use; no paid model is selected automatically.
- JPG, PNG and WEBP attachments can be sent to Gemini vision in Cloud AI. Local AI extracts editable text with Tesseract.js and sends only that text to the selected local model; it does not provide local visual understanding. PDFs use PDF.js text extraction (up to 20 pages / 50,000 characters); scanned PDFs fall back to OCR for up to the first three pages. OCR can fail on handwriting, poor images or diagrams.
- Compiler Hub provides CodeMirror editing and real browser JavaScript execution in a sandboxed iframe, HTML/CSS preview, Python through Pyodide, and SQL through SQLite WebAssembly. C, C++ and Java are visibly unavailable. Python and SQL runtimes load from a CDN on first use. The JavaScript runner stops waiting after three seconds; this is not a hardened hostile-code execution service.
- Code or compiler errors can be sent to Smart Assistant. Review generated code before running it.

## Architecture

Vite builds a static frontend for GitHub Pages. The assistant router sends requests only to the selected mode. A Web Worker hosts WebLLM inference; the Cloudflare Worker validates and streams Gemini requests. Gemini secrets never enter frontend code. The Worker avoids logging prompts and files and includes a basic in-memory per-IP throttle; configure Cloudflare rate limiting and strict `ALLOWED_ORIGINS` for public use.

## Requirements

- Node.js 20.19+ or 22.12+.
- A current Chromium-based browser and WebGPU-compatible device for Local AI; GPU memory requirements vary.
- Cloudflare account and Gemini API key only for Cloud AI.

## Run locally

1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Open the project folder in VS Code.
3. In a terminal, run `npm install`, then `npm run dev`.
4. Open the local URL printed by Vite. To run the production build locally, use `npm run build` followed by `npm run preview`.
5. Run the included Worker checks with `npm test`.

## Configure Cloud AI securely

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey). Review current free-tier availability, quotas, model status and data terms in Google's documentation.
2. Install Wrangler with `npm install --global wrangler`, then sign in with `wrangler login`.
3. From the `worker` directory, run `wrangler secret put GEMINI_API_KEY`. Enter the key only in Wrangler's prompt. Never add it to frontend settings, `.env`, source control or chat history.
4. Set `GEMINI_MODEL` in `worker/wrangler.toml` to a model currently available to your account. Model access and free quotas change; verify the [official model documentation](https://ai.google.dev/gemini-api/docs/models) and [image documentation](https://ai.google.dev/gemini-api/docs/image-understanding).
5. Set `ALLOWED_ORIGINS` to your exact site origin(s) in `worker/wrangler.toml`, then run `wrangler deploy` from `worker`.
6. Copy the Worker URL into Assistant → Settings → Cloud AI connection.
7. Configure Cloudflare rate limits and usage controls before sharing the site publicly. The included Worker throttle is per isolate, not a distributed abuse shield.

## Deploy the frontend to GitHub Pages

The repository includes `.github/workflows/pages.yml`. Pushes to `main` build the Vite site and publish `dist/` through GitHub Pages. In the repository settings, ensure Pages uses **GitHub Actions** as its build and deployment source. Vite's `base` is set to `/Compyde/` for this repository. After Pages is available, add the exact site origin to Worker `ALLOWED_ORIGINS` and redeploy the Worker.

## Local AI troubleshooting

- If WebGPU is unavailable, use a supported, current desktop browser, enable hardware acceleration, and check graphics drivers. Choose Cloud AI manually if desired; the app will not silently fall back.
- Retry a failed or interrupted model download by selecting the model again. Browser storage limits and cache eviction vary by device.
- If initialization fails or memory runs out, reload the page, close GPU-heavy tabs, and try the smallest available model. Not every model fits every device.
- Model options come from the installed WebLLM registry. Check the [WebLLM documentation](https://webllm.mlc.ai/docs/) before changing the pinned package or model IDs.

## Privacy and limits

Local inference sends prompts only to the local browser model. The first model download retrieves model files from WebLLM's hosting source. Cloud mode sends prompts and any included image data to your Worker and Gemini. PDF text is extracted in the browser and sent to the currently selected mode. OCR also runs in the browser. No prompt analytics are included. Chat history is device-specific and is not synchronized.


