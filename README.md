# COMPYDE

**Code. Learn. Solve.** COMPYDE is a browser-first programming workspace for students with two products: Compiler Hub and Smart Assistant.

## Features

- Responsive home and workspace with persistent light/dark theme.
- Smart Assistant offers explicitly selected Local AI and Cloud AI; it never switches modes automatically.
- Cloud AI calls the Google Gemini API directly from the browser. Enter your own key in Assistant settings. The key stays in JavaScript memory for the current tab only; it is never saved to LocalStorage, IndexedDB, or source control. Reloading the page forgets it.
- Direct browser API keys are visible to browser users and can be inspected in developer tools. This trades server-side key protection for a no-backend setup. Use a dedicated key restricted to the Gemini API, monitor quotas and billing, and never use this approach for a shared public key. Google recommends a backend proxy for production client applications.
- Gemini streaming uses the currently documented `gemini-3.8-flash` model. Image attachments go directly to Gemini. PDF text is extracted in the browser before sending. AI availability, quotas, pricing and model support are controlled by Google.
- Local AI runs WebLLM in a Web Worker with WebGPU. It loads only after you choose a model and start loading it. The model cache is managed by WebLLM; settings offer load, unload and cache deletion. Model downloads can be several GB and availability depends on browser, GPU and memory. Local prompts are not sent to Gemini.
- Conversations are stored in browser IndexedDB, with migration from older LocalStorage history, search, edit last prompt, regenerate, stop generation, per-chat deletion, JSON export, and clear-all controls. Browser data is device-specific and can be removed when browser data is cleared.
- JPG, PNG and WEBP attachments support Gemini image understanding. Local AI extracts editable text with Tesseract.js and sends only that text to the local model; it does not provide local visual understanding. PDFs use PDF.js extraction (up to 20 pages / 50,000 characters); scanned PDFs use OCR for up to the first three pages. OCR can fail on handwriting, poor images or diagrams.
- Compiler Hub provides CodeMirror editing, JavaScript execution in a sandboxed iframe, HTML/CSS preview, Python through a cached Pyodide runtime in a Web Worker, SQL through bundled SQLite WebAssembly, and local C/C++/Java WebAssembly compilers. C and C++ compile and run inside a browser worker using a roughly 95 MB Clang/LLVM toolchain; the first download is hosted with the site and the browser may cache it. Java uses an offline OpenJDK javac plus TeaVM toolchain bundled with the site. Its Java standard-library/runtime support is a subset, and interactive standard input is not supported. JavaScript, C, C++, and Java execution have time limits, but browser compilers are not hardened for hostile code. Python downloads Pyodide from its CDN on first use.
- Code or compiler errors can be sent to Smart Assistant. Review generated code before running it.

## Run locally

1. Install Node.js 20.19+ or 22.12+ from [nodejs.org](https://nodejs.org/).
2. Open the project folder in VS Code.
3. In a terminal, run `npm install`, then `npm run dev`.
4. Open the local URL printed by Vite. For a production preview, run `npm run build`, then `npm run preview`.
5. Run Gemini request tests with `npm test`.

## Connect Gemini

1. Create a new Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey). Do not reuse the key shown in the earlier screenshot; revoke it first.
2. In COMPYDE, open Smart Assistant → Settings → Cloud AI. Paste the new key and choose **Use key in this tab**.
3. Choose Cloud AI and send a prompt. The key is kept only in memory until this tab reloads or you choose **Forget key**.
4. Restrict the key to the Gemini API and monitor use in Google AI Studio. Never commit a key or put it in the source code.

This direct connection sends prompts and selected attachments from the browser to Google. It needs no Cloudflare account, Worker, or backend. Because the browser must hold the key to make direct requests, it is not suitable for embedding a shared owner key in a public website. See Google's [API key guidance](https://ai.google.dev/gemini-api/docs/api-key) and [model documentation](https://ai.google.dev/gemini-api/docs/models).

## Deploy to GitHub Pages

The repository includes `.github/workflows/pages.yml`. Pushes to `main` build Vite and publish `dist/` through GitHub Actions. In the repository settings, set Pages' source to **GitHub Actions**. Vite's base path is `/Compyde/` for this repository.

## Local AI troubleshooting

- If WebGPU is unavailable, use a supported, current desktop browser, enable hardware acceleration, and check graphics drivers. You can choose Cloud AI manually; the app will not silently fall back.
- Retry a failed or interrupted model download by selecting the model again. Browser storage limits and cache eviction vary by device.
- If initialization fails or memory runs out, reload the page, close GPU-heavy tabs, and try the smallest listed model. Not every model fits every device.
- Model options come from the installed WebLLM registry. Check the [WebLLM documentation](https://webllm.mlc.ai/docs/) before changing the pinned package or model IDs.

## Privacy and limits

Local inference sends prompts only to the local browser model. The first model download retrieves model files from WebLLM's hosting source. Cloud AI sends prompts and attached image data directly to Google Gemini. PDF text and OCR are processed in the browser, then sent only to the selected mode. No prompt analytics are included. Chat history is device-specific and is not synchronized.


