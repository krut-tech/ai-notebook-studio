# AI Notebook Studio

A browser-based notebook creator that turns typed text and imported documents into handwritten, scanned-style notebook PDFs. Core conversion and profile capture run locally in the browser; no backend or paid API is required for the current feature set.

## Current features

- Live handwritten notebook preview and PDF export
- Text and PDF import; text PDFs via PDF.js and scanned PDFs via Tesseract.js (English, Hindi and Gujarati)
- Handwriting fonts and custom TTF/OTF upload
- Personal handwriting profiles from a printable character template
- **Camera handwriting capture:** use a phone/laptop camera to photograph the completed template, crop to the on-screen guide, and extract glyphs locally
- Image upload fallback for scanned or photographed handwriting sheets
- Ruled, double-line, graph and plain paper; ink colours; page header; question underline; scanner effect
- Responsive dark workspace UI

## Create a personal handwriting profile

1. Open the app on **HTTPS or localhost** (camera access is blocked on most insecure HTTP origins).
2. Select **Get template** and print the downloaded template at 100% scale.
3. Write each printed character in its matching box using a dark pen. Keep the writing near the baseline and avoid touching box borders.
4. Select **Scan with camera** and allow camera permission, or use **Upload handwriting sheet** to select an existing photo/scan.
5. Keep the entire sheet inside the guide, use bright even lighting, avoid shadows and hold the camera parallel to the paper.
6. Capture the sheet, name the profile, then select **My handwriting** in the handwriting font list.

The current glyph template covers English letters, digits and basic punctuation. Hindi/Gujarati handwriting-profile extraction, automatic perspective correction, per-character correction, and multi-profile management remain planned improvements. Non-Latin text continues to use the selected fallback handwriting font.

## Privacy and storage

- Camera access starts only after the user selects **Scan with camera**.
- The camera stream is stopped when the capture dialog closes or the page is left.
- Captured images are processed in the browser and are not uploaded to a server by this app.
- Extracted glyphs are saved in browser local storage on the current device. Clearing site data/browser storage removes them; export/import profile backup is planned.
- Do not capture another person's handwriting without their permission.

## Run locally

Open `index.html` using a local development server, for example:

```bash
npx serve .
```

For camera access, use localhost or deploy behind HTTPS.

## Roadmap

- Better template alignment, perspective correction and image quality checks
- Gujarati/Hindi handwriting character profiles and additional scripts
- Multiple named profiles with import/export and editable glyphs
- Autosaved notebooks, project management, undo/redo and page thumbnails
- Improved OCR layout detection and large-document processing
- High-resolution/vector PDF export
- Optional AI note generation with configurable provider adapters
- Vite + React + TypeScript migration and Tauri desktop app
- Automated unit, browser and PDF export tests
