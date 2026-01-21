# <img src="public/icon.svg" width="28" height="28" style="vertical-align: middle"> Pixel Extractor

A web-based tool to extract clean pixel art sprites from AI-generated or poorly saved pixel art (e.g. JPEG artifacts), built on top of [Donitzo's ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor).

**👉 [Try it online](https://univeous.github.io/Pixel-Extractor/)**

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

## How It Works

This tool uses **edge detection** and **grid fitting algorithms** to intelligently analyze the image and restore the original pixel grid — not just blindly resize.

- **Automatic grid detection** - No need to manually input pixel size; the algorithm finds the optimal grid
- **Non-square pixel support** - Handles images where X and Y pixel ratios differ (common in AI art)
- **Automatic sprite detection** - Splits images with multiple sprites into individual assets
- **Smart color quantization** - Histogram or K-Means methods to clean up color noise
- **Background removal** - Auto-detect or manually specify the background color
- **Before/after comparison** - Interactive slider to verify extraction quality

## Getting Started

### Recommended: Install as PWA

For the best experience, **install the app as a PWA** (Progressive Web App):

1. Visit the [online demo](https://univeous.github.io/Pixel-Extractor/)
2. Click the install button in your browser's address bar (or use browser menu → "Install app")
3. Done! The app now works offline and feels like a native application

The first load downloads ~30MB of Python packages (NumPy, SciPy, etc.), which are then cached locally. After that, the app loads quickly — even offline.

### UI Tips

- **Network status indicator** (top-right corner): Shows online/offline status. If a new version is available, it will show an update icon — click to refresh and update.
- **Right-click history items**: Reprocess the original or result image with current parameters
- **Processing history**: Saved locally in IndexedDB across sessions (clearing browser data will erase history)

<details>
<summary><b>Run Locally / Self-host</b></summary>

<br>

**Prerequisites:** Node.js 18+

```bash
# Clone the repository
git clone https://github.com/univeous/Pixel-Extractor.git
cd Pixel-Extractor

# Install dependencies (or use yarn/pnpm/bun)
npm install

# Run dev server
npm run dev
```

Open http://localhost:3000

**Build:**

```bash
npm run build
```

Output will be in `dist/` folder.

**Deploy to GitHub Pages:**

1. Fork this repository
2. Go to Settings → Pages → Source: "GitHub Actions"
3. Push to `main` branch — it will auto-deploy

Your app will be available at `https://<username>.github.io/Pixel-Extractor/`

</details>

## Screenshots

<p align="center">
  <img src="docs/sc4.png" width="49%" />
  <img src="docs/sc2.png" width="49%" />
</p>
<p align="center">
  <img src="docs/sc5.png" width="49%" />
  <img src="docs/sc3.png" width="49%" />
</p>

## FAQ

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

<details>
<summary><b>Why Python/WASM instead of pure TypeScript?</b></summary>

<br>

The core algorithm relies heavily on scientific computing libraries:

- **NumPy** - Fast array operations and linear algebra
- **SciPy** - Signal processing (peak detection, optimization)
- **scikit-image** - Image processing (morphology, edge detection, denoising)
- **scikit-learn** - K-Means clustering for color quantization

Reimplementing all of this in TypeScript would be:
1. A massive undertaking (thousands of lines of optimized numerical code)
2. Likely slower (these libraries use highly optimized C/Fortran under the hood)
3. Hard to maintain (the original algorithm is in Python)

Thanks to [Pyodide](https://pyodide.org/), we can run the exact same Python code in the browser via WebAssembly. The tradeoff is a ~30MB initial download (cached after first load), but the processing itself is quite fast.

</details>

<details>
<summary><b>Why is the first load so slow?</b></summary>

<br>

On first visit, the app needs to download:
- Pyodide runtime (~10MB)
- Python packages: NumPy, SciPy, scikit-image, scikit-learn (~20MB total)

This is cached by the Service Worker, so subsequent visits (even offline) load instantly. Install as a PWA for the best experience.

</details>

<details>
<summary><b>My extracted sprite looks wrong</b></summary>

<br>

This tool is not a magic fix — AI-generated pixel art often has fundamental issues (inconsistent grid mostly) that no algorithm can fully correct.

That said, try adjusting these parameters:

- **Max Colors** - Increase if you're losing color detail, decrease if there's too much noise
- **Color Sampling / Edge Detection** - Try switching between Histogram and K-Means
- **Island Removal** - Increase to remove more isolated noise pixels
- **Remove Background** - Toggle off if the background is being incorrectly detected

Think of this tool as giving you a **cleaner base** to work with. The output may still need manual touch-ups, but it should be much easier than starting from the raw AI output.

</details>

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Processing**: Python (NumPy, SciPy, scikit-image, scikit-learn) running in WebAssembly via Pyodide
- **Build**: Vite

## Credits

Core extraction algorithm based on [ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor) by Donitzo.
