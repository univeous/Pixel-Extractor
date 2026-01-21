export default {
  // App title (keep as is)
  appTitle: 'Pixel Extractor',
  
  // Status
  statusLoading: '加载中...',
  statusProcessing: '处理中...',
  statusReady: '就绪',
  
  // Method names (keep technical terms)
  histogram: 'Histogram',
  kmeans: 'K-Means',
  
  // Configuration
  configuration: '设置',
  maxColors: '最大颜色数',
  maxColorsHelp: '输出调色板的最大颜色数。数值越高细节越丰富，但文件也越大。',
  minSpriteSize: '最小尺寸',
  minSpriteSizeHelp: 'Sprite 的最小宽高。小于此值会被当作噪点过滤。',
  islandRemovalSize: '孤岛过滤',
  islandRemovalSizeHelp: '移除小于此尺寸的孤立像素块，清理边缘噪点。',
  colorSampling: '颜色采样',
  colorSamplingHelp: '颜色量化方法。不同方法适合不同的画风。',
  edgeDetection: '边缘检测',
  edgeDetectionHelp: '检测 Sprite 边界的算法。不同方法适合不同的画风。',
  removeBackgroundColor: '去除背景色',
  removeBackgroundColorHelp: '启用后会将指定颜色（自动检测或手动）视为透明。禁用则仅使用原有 Alpha 通道。',
  autoDetectBackground: '自动检测',
  autoDetectBackgroundHelp: '从图像边缘自动检测背景色。',
  backgroundColor: '背景色',
  backgroundColorHelp: '指定要视为透明的颜色。',
  
  // History
  history: '历史',
  noHistory: '暂无记录',
  sprites: '个',
  
  // Upload
  uploadTitle: '拖放图片到这里',
  uploadSubtitle: '或点击选择文件',
  uploadFormats: 'PNG / JPG',
  
  // Details Modal
  details: '详情',
  dimensions: '尺寸',
  result: '结果',
  originalCrop: '原始',
  gridSize: '网格',
  paletteDetected: '调色板',
  generationParams: '参数',
  autoTransparency: '自动透明',
  on: '开',
  off: '关',
  downloadOriginal: '保存原图',
  downloadProcessed: '保存结果',
  debugInfo: '分析报告',
  
  // View modes
  split: '对比',
  original: '原图',
  stretch: '拉伸',
  
  // Processing messages (from Python)
  readingFile: '读取文件...',
  complete: '完成！',
  foundCachedResult: '找到相同的缓存结果，跳过处理。',
  processingInit: '初始化...',
  processingDenoise: '降噪处理...',
  processingAnalyzeColor: '分析透明色...',
  processingSplit: '分割区域...',
  processingSubregion: '子区域',
  processingPrepare: '准备中...',
  processingColorAnalysis: '颜色分析...',
  processingEdgeDetection: '边缘检测...',
  processingGridFit: '网格拟合...',
  processingGenerateSprite: '生成 Sprite...',
  processingComplete: '处理完成！',
  
  // Network status
  online: '在线',
  offline: '离线（使用缓存数据）',
  updateAvailable: '有新版本可用',
  clickToRefresh: '点击清除缓存并刷新',
  
  // Context menu
  reprocessOriginal: '用当前参数重新处理原图',
  reprocessResult: '用当前参数重新处理结果',
  delete: '删除',
} as const;
