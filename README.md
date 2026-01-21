# Pixel Extractor

Extract pixel art sprites from images using Python (Pyodide/WASM).

## Features

- Automatic sprite detection and extraction
- Color quantization (Histogram / K-Means)
- Grid size detection
- Background color removal
- Before/after comparison view
- PWA support (installable, works offline after first load)
- Multi-language support (EN / 中文 / 日本語)

## Run Locally

**Prerequisites:** Node.js (npm, yarn, pnpm, bun, etc.)

```bash
# Install dependencies
npm install
# or: yarn / pnpm install / bun install

# Run dev server
npm run dev
# or: yarn dev / pnpm dev / bun dev
```

Open http://localhost:3000

## Build

```bash
npm run build
```

Output will be in `dist/` folder.

## Credits

Core extraction algorithm based on [ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor) by Donitzo.
