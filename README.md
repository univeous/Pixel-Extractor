# Pixel Extractor

A web-based tool to extract pixel art sprites from AI-generated or upscaled images, built on top of [Donitzo's ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor).

<p align="center">
  <img src="docs/sc2.png" width="49%" />
  <img src="docs/sc1.png" width="49%" />
</p>

## Why This Tool?

- **Not just resizing** - Uses advanced edge detection and grid fitting algorithms to accurately restore the original pixel grid, not simple nearest-neighbor downscaling
- **Non-square pixel support** - Handles images where pixels aren't perfect squares (common in AI-generated art)
- **Automatic sprite detection** - Splits images with multiple sprites into individual assets
- **Smart color quantization** - Choose between Histogram (fast) or K-Means (accurate) for optimal palette extraction
- **Background removal** - Auto-detect or manually specify the background color to make it transparent
- **Before/after comparison** - Interactive slider to compare original and extracted results

## Features

- **Polished UI** - Clean, modern dark theme with intuitive controls and real-time parameter adjustment
- **PWA support** - Install it as an app, works offline after first load — almost like a native app! Check out the screenshots above ;)
- **Processing history** - All your extractions are saved locally (IndexedDB) and persist across sessions
- **Multi-language** - English / 中文 / 日本語

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Processing**: Python (NumPy, SciPy, scikit-image, scikit-learn) running in WebAssembly via Pyodide
- **Build**: Vite

## Run Locally

**Prerequisites:** Node.js (npm, yarn, pnpm, bun, etc.)

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
```

Output will be in `dist/` folder.

## Credits

Core extraction algorithm based on [ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor) by Donitzo.
