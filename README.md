# AI Notebook Studio

AI Notebook Studio creates handwritten-style study notebooks from typed text and imported documents. The current app is a browser-first prototype with local processing and local project storage. Optional generative AI services are not configured by default.

## Implemented in this branch

### Notebook workspace
- Responsive dark workspace with live notebook preview
- A4, A5, Letter and Legal page dimensions; portrait and landscape
- Ruled, double-line, graph and plain paper
- Normal, narrow and wide margins; ink colour, paper colour, font size, line spacing and handwriting variation
- Student name, roll number, subject, date, question underline and page-number footer
- Scanned-paper texture, grayscale and scan-noise controls
- Page zoom, page thumbnails, PNG first-page export, PDF export and compressed/high-quality PDF modes

### Content and study tools
- Text input and TXT/PDF import
- Text PDF extraction using PDF.js
- Scanned PDF OCR using Tesseract.js with English, Hindi and Gujarati language data
- Offline text cleanup, summary-by-leading-sentences, key-point extraction, chapter outline and basic Q&A formatting
- Undo/redo for text edits

**AI note generation limitation:** the offline study helpers are deterministic text-formatting tools, not a generative AI model. Translation, reliable chapter understanding, question-answer generation and original AI summaries require a configured AI provider and secure backend/proxy. Never put a private API key in browser JavaScript.

### Handwriting
- Handwriting font presets and custom TTF/OTF/WOFF font upload
- Personal glyph profiles from printed character sheets
- Camera capture using browser `getUserMedia`, front/rear camera selection, capture guide and local image processing
- Image upload fallback
- Latin/English, basic Hindi (Devanagari) and basic Gujarati character-sheet templates
- Grapheme-aware glyph rendering where supported by `Intl.Segmenter`
- Local profile persistence in browser storage

**Handwriting limitations:** current profile extraction is a simple fixed-grid cropper. Camera alignment/perspective correction, per-character validation and editing, ligatures/conjuncts, full Unicode script coverage, multiple named profile management and profile import/export are not yet production-grade. The Hindi/Gujarati sheets cover a limited basic character set, not every matra, conjunct, punctuation mark or shaping form. Unsupported glyphs fall back to the selected handwriting font.

## Create a personal handwriting profile

1. Open the app on HTTPS or localhost; browsers generally block camera access on insecure HTTP.
2. Choose English/Latin, Hindi or Gujarati under Handwriting script.
3. Download and print the corresponding template at 100% scale.
4. Write one character in each matching box with a dark pen. Keep each glyph within its cell and away from the borders.
5. Choose Scan with camera and grant camera permission, or upload a clear photo/scan.
6. Keep the page aligned with the on-screen guide, use even lighting and avoid shadows.
7. Review the captured profile status and select My handwriting in the font list.

Camera images and extracted glyphs are processed locally by this app. Camera access starts only after the user presses the camera button; the camera stream is stopped when the dialog closes or the page is left. Capture only handwriting you have permission to use.

## Projects and local data

- Save, open, duplicate and delete notebook projects on this device
- Debounced local autosave for notebook text and settings
- Text undo/redo history during the current session

Projects and handwriting glyph data currently use browser local storage. Browser storage is device/browser-specific and can be cleared by the user or browser. Export/restore backups, cloud sync, accounts and multi-device collaboration are not yet implemented. Large handwriting profiles may exceed localStorage quotas; IndexedDB migration is recommended before production use.

## Run locally

```bash
npx serve .
```

Open the local server URL in a modern browser. Camera access requires localhost or HTTPS. The app currently loads PDF.js, jsPDF, Tesseract.js and web fonts from CDNs, so first-time OCR and some visual assets require an internet connection. Offline packaging of these dependencies remains a production task.

## Remaining production roadmap

- True AI note generation, translation, configurable provider adapters and secure backend key management
- Full language support and script-specific handwriting shaping/ligatures
- Perspective correction, document boundary detection, quality checks and per-character glyph editor
- Multiple named handwriting profiles and per-character glyph editor
- IndexedDB storage, robust autosave recovery, version history and project search/tags/folders
- Multi-file import, page selection, image import, OCR correction editor, tables/columns/equation extraction and worker cancellation/progress
- Vector/text PDF export where feasible, DPI controls, print preview and PDF metadata
- Diagram and math equation authoring
- Stylus/touch freehand input
- Vite + React + TypeScript modular architecture and Tauri desktop packaging
- Automated unit, integration, accessibility, browser, mobile and PDF regression tests

## Security and quality notes

- Do not store private AI provider credentials in client-side code.
- Validate uploaded font, image and document sizes/types before processing.
- Large OCR and image processing should move to workers with cancellation and progress reporting.
- Verify PDF exports and camera behavior on actual desktop and mobile browsers before production release.
