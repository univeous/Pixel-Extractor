# <img src="public/icon.svg" width="28" height="28" style="vertical-align: middle"> Pixel Extractor

A web-based tool to extract pixel art sprites from AI-generated or upscaled images, built on top of [Donitzo's ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor).

<p align="center">
  <img src="docs/sc1.png" width="80%" />
</p>

## The Problem

AI-generated pixel art often comes with various artifacts that make it unusable as actual game assets:

- **Color bleeding** - Stray colors bleeding between adjacent pixels
- **Anti-aliasing artifacts** - Soft edges and gradients where there should be hard pixel boundaries
- **Inconsistent grid** - Pixels that don't align to a regular grid, or non-square pixel ratios
- **Noisy backgrounds** - Backgrounds with slight color variations instead of solid colors

Most existing tools don't handle these issues well:
- Simple resizing (nearest-neighbor) just makes the mess smaller
- Manual tools require you to guess the pixel grid size

## Why This Tool?

This tool uses **edge detection** and **grid fitting algorithms** to intelligently analyze the image and restore the original pixel grid — not just blindly resize.

- **Automatic grid detection** - No need to manually input pixel size; the algorithm finds the optimal grid
- **Non-square pixel support** - Handles images where X and Y pixel ratios differ (common in AI art)
- **Automatic sprite detection** - Splits images with multiple sprites into individual assets
- **Smart color quantization** - Histogram or K-Means methods to clean up color noise
- **Background removal** - Auto-detect or manually specify the background color
- **Before/after comparison** - Interactive slider to verify extraction quality

<details>
<summary><b>Histogram vs K-Means: Which to choose?</b></summary>

<br>

Neither method is universally better — they suit different art styles. Here's an example where **Histogram** preserves subtle color variations better than K-Means:

| Original | Histogram | K-Means |
|:--------:|:---------:|:-------:|
| <img src="docs/cmp_orig.png" width="200"> | <img src="docs/cmp_hist.png" width="200"> | <img src="docs/cmp_km.png" width="200"> |

Notice the sky area: the original has three similar but distinct blue tones. 

- **Histogram** correctly preserves colors, maintaining the subtle gradient
- **K-Means** merges them into a single blue, losing the atmospheric depth

This happens because K-Means optimizes for cluster centroids, which can group perceptually distinct but numerically close colors together. Histogram-based quantization respects the actual color distribution in the image.

**Tip**: Just try both and see which works better for your image — processing is fast! 😉

</details>

## Features

- **Polished UI** - Clean, modern dark theme with intuitive controls and real-time parameter adjustment
- **PWA support** - Install it as an app, works offline after first load — almost like a native app! Check out the screenshots above ;)
- **Processing history** - All your extractions are saved locally in IndexedDB and persist across sessions (note: clearing browser data will erase history)
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

## Screenshots

<p align="center">
  <img src="docs/sc4.png" width="49%" />
  <img src="docs/sc2.png" width="49%" />
</p>
<p align="center">
  <img src="docs/sc5.png" width="49%" />
  <img src="docs/sc3.png" width="49%" />
</p>

## Credits

Core extraction algorithm based on [ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor) by Donitzo.
