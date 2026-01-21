export default {
  // App title (keep as is)
  appTitle: 'Pixel Extractor',
  
  // Status
  statusLoading: 'Loading WASM...',
  statusProcessing: 'Processing...',
  statusReady: 'Ready',
  
  // Method names (keep technical terms)
  histogram: 'Histogram',
  kmeans: 'K-Means',
  
  // Configuration
  configuration: 'Configuration',
  maxColors: 'Max Colors',
  maxColorsHelp: 'Maximum number of colors in the output palette. Higher values preserve more detail but increase file size.',
  minSpriteSize: 'Min Sprite Size',
  minSpriteSizeHelp: 'Minimum width/height for a sprite to be kept. Smaller sprites are discarded as noise.',
  islandRemovalSize: 'Island Removal',
  islandRemovalSizeHelp: 'Removes small isolated pixel groups (islands) smaller than this value to clean up noisy edges.',
  colorSampling: 'Color Sampling',
  colorSamplingHelp: 'Method used to reduce colors. Different methods suit different art styles.',
  edgeDetection: 'Edge Detection',
  edgeDetectionHelp: 'Algorithm used to detect sprite boundaries. Different methods suit different art styles.',
  removeBackgroundColor: 'Remove Background',
  removeBackgroundColorHelp: 'Enable to treat a specific color (auto-detected or manual) as transparent. Disable to only use the original alpha channel.',
  autoDetectBackground: 'Auto Detect',
  autoDetectBackgroundHelp: 'Automatically detect the background color from image edges.',
  backgroundColor: 'Background Color',
  backgroundColorHelp: 'Color to be treated as transparent/background.',
  
  // History
  history: 'History',
  noHistory: 'No history yet.',
  sprites: 'sprites',
  
  // Upload
  uploadTitle: 'Drop Image Here',
  uploadSubtitle: 'or click to browse',
  uploadFormats: 'PNG / JPG',
  
  // Details Modal
  details: 'Details',
  dimensions: 'Dimensions',
  result: 'Result',
  originalCrop: 'Source',
  gridSize: 'Grid',
  paletteDetected: 'Palette',
  generationParams: 'Parameters',
  autoTransparency: 'Auto Transparency',
  on: 'On',
  off: 'Off',
  downloadOriginal: 'Save Original',
  downloadProcessed: 'Save Result',
  debugInfo: 'Analysis',
  
  // View modes
  split: 'Compare',
  original: 'Original',
  stretch: 'Stretch',
  
  // Processing messages (from Python)
  readingFile: 'Reading file...',
  complete: 'Complete!',
  foundCachedResult: 'Found identical cached result, skipping processing.',
  processingInit: 'Initializing...',
  processingDenoise: 'Denoising...',
  processingAnalyzeColor: 'Analyzing transparency...',
  processingSplit: 'Splitting regions...',
  processingSubregion: 'Subregion',
  processingPrepare: 'Preparing...',
  processingColorAnalysis: 'Color analysis...',
  processingEdgeDetection: 'Edge detection...',
  processingGridFit: 'Grid fitting...',
  processingGenerateSprite: 'Generating sprite...',
  processingComplete: 'Done!',
  
  // Network status
  online: 'Online',
  offline: 'Offline (using cached data)',
  updateAvailable: 'Update available',
  clickToRefresh: 'Click to clear cache and reload',
  
  // Context menu
  reprocessOriginal: 'Reprocess Original',
  reprocessResult: 'Reprocess Result',
  delete: 'Delete',
} as const;
