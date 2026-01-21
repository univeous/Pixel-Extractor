export default {
  // App title (keep as is)
  appTitle: 'Pixel Extractor',
  
  // Status
  statusLoading: '読み込み中...',
  statusProcessing: '処理中...',
  statusReady: '準備完了',
  
  // Method names (keep technical terms)
  histogram: 'Histogram',
  kmeans: 'K-Means',
  
  // Configuration
  configuration: '設定',
  maxColors: '最大色数',
  maxColorsHelp: 'パレットの最大色数。値が高いほど詳細が保持されますが、ファイルサイズも大きくなります。',
  minSpriteSize: '最小サイズ',
  minSpriteSizeHelp: 'Sprite の最小幅/高さ。これより小さいものはノイズとして除外されます。',
  islandRemovalSize: '孤立除去',
  islandRemovalSizeHelp: '指定サイズより小さい孤立ピクセルを除去し、エッジをクリーンアップします。',
  colorSampling: 'カラーサンプリング',
  colorSamplingHelp: '減色方法。異なる方法は異なるアートスタイルに適しています。',
  edgeDetection: 'エッジ検出',
  edgeDetectionHelp: 'Sprite 境界の検出アルゴリズム。異なる方法は異なるアートスタイルに適しています。',
  removeBackgroundColor: '背景色除去',
  removeBackgroundColorHelp: '特定の色（自動検出または手動指定）を透明として扱います。無効時は元の Alpha チャンネルのみ使用。',
  autoDetectBackground: '自動検出',
  autoDetectBackgroundHelp: '画像の端から背景色を自動検出します。',
  backgroundColor: '背景色',
  backgroundColorHelp: '透明として扱う色を指定します。',
  
  // History
  history: '履歴',
  noHistory: '履歴なし',
  sprites: '個',
  
  // Upload
  uploadTitle: 'ここに画像をドロップ',
  uploadSubtitle: 'またはクリックして選択',
  uploadFormats: 'PNG / JPG',
  
  // Details Modal
  details: '詳細',
  dimensions: 'サイズ',
  result: '結果',
  originalCrop: '元画像',
  gridSize: 'グリッド',
  paletteDetected: 'パレット',
  generationParams: 'パラメータ',
  autoTransparency: '自動透過',
  on: 'オン',
  off: 'オフ',
  downloadOriginal: '元画像を保存',
  downloadProcessed: '結果を保存',
  debugInfo: '分析レポート',
  
  // View modes
  split: '比較',
  original: '元画像',
  stretch: 'ストレッチ',
  
  // Processing messages (from Python)
  readingFile: 'ファイル読み込み中...',
  complete: '完了！',
  foundCachedResult: '同一のキャッシュ結果が見つかりました。処理をスキップします。',
  processingInit: '初期化中...',
  processingDenoise: 'ノイズ除去中...',
  processingAnalyzeColor: '透明色を分析中...',
  processingSplit: '領域を分割中...',
  processingSubregion: 'サブ領域',
  processingPrepare: '準備中...',
  processingColorAnalysis: 'カラー分析中...',
  processingEdgeDetection: 'エッジ検出中...',
  processingGridFit: 'グリッドフィッティング中...',
  processingGenerateSprite: 'Sprite 生成中...',
  processingComplete: '処理完了！',
  
  // Network status
  online: 'オンライン',
  offline: 'オフライン（キャッシュデータを使用）',
  updateAvailable: '更新が利用可能です',
  clickToRefresh: 'クリックでキャッシュをクリアして再読み込み',
} as const;
