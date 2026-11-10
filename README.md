# AI Notebook Studio

Free, offline-first converter: typed text or PDF -> handwritten, scanned-style notebook PDF.
Everything runs in the browser (no server, no paid APIs).

## Current features
- Text input, PDF import (text PDFs via pdf.js, scanned PDFs via Tesseract.js OCR: eng + hin + guj)
- Question/answer detection, question underline, page header, double margin line
- Handwriting fonts, custom TTF/OTF upload, personal handwriting profile from a scanned template sheet
- Ruled / double / graph / unruled paper, ink colours, scanner effect, PDF export

## Run locally
Open `index.html` in a browser (or `npx serve .`).

## Roadmap
See the architecture decision: client-side WASM processing (Option B), Vite + React + TypeScript + Tailwind, Tauri for the Windows app.
