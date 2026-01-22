type Locale = 'en' | 'zh' | 'ja';

interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  locale: string;
  structuredData: {
    "@context": string;
    "@type": string;
    "name": string;
    "description": string;
    "url": string;
    "applicationCategory": string;
    "operatingSystem": string;
    "featureList": string[];
  };
}

const baseConfig = {
  author: "univeous",
  url: "https://univeous.github.io/Pixel-Extractor/",
  image: "https://univeous.github.io/Pixel-Extractor/docs/sc1.png",
  siteName: "Pixel Extractor",
  languages: [
    { code: "en", href: "https://univeous.github.io/Pixel-Extractor/" },
    { code: "zh-CN", href: "https://univeous.github.io/Pixel-Extractor/" },
    { code: "ja", href: "https://univeous.github.io/Pixel-Extractor/" },
  ],
};

const seoConfigs: Record<Locale, SEOConfig> = {
  en: {
    title: "Pixel Extractor - AI Pixel Art Sprite Extractor | Online Tool",
    description: "Free online tool to extract clean pixel art sprites from AI-generated or poorly saved pixel art. Automatic grid detection, color quantization, background removal, sprite splitting. PWA support for offline use.",
    keywords: "pixel art, pixel sprite, AI pixel art, pixel extraction, pixel cleanup, game assets, pixel grid, color quantization, background removal, pixel tool, online tool, free tool, fix ai pixelart, fix ai pixel art, ai pixelart fixer, pixelart cleaner, pixel art fixer, clean pixel art, pixel art extractor, sprite extractor, ai art converter, pixel art tool, pixel art editor, pixel art processor",
    locale: "en_US",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Pixel Extractor",
      "description": "Free online tool to extract clean pixel art sprites from AI-generated pixel art. Automatic grid detection, color quantization, background removal, sprite splitting.",
      "url": "https://univeous.github.io/Pixel-Extractor/",
      "applicationCategory": "GraphicsApplication",
      "operatingSystem": "Web Browser",
      "featureList": [
        "Automatic grid detection",
        "Color quantization (Histogram/K-Means)",
        "Background removal",
        "Sprite splitting",
        "Before/after comparison",
        "PWA offline support"
      ]
    }
  },
  zh: {
    title: "Pixel Extractor - AI像素艺术提取工具 | 在线像素精灵提取器",
    description: "免费在线工具，从AI生成的像素艺术中提取干净的像素精灵。自动网格检测、颜色量化、背景移除、精灵分割。支持PWA离线使用。",
    keywords: "像素艺术,像素精灵,AI像素艺术,像素提取,像素清理,游戏素材,像素网格,颜色量化,背景移除,像素工具,在线工具,免费工具,修复AI像素艺术,AI像素艺术修复,像素艺术清理器,像素艺术提取器,精灵提取器,AI艺术转换器,像素艺术工具,像素艺术编辑器,像素艺术处理器",
    locale: "zh_CN",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Pixel Extractor",
      "description": "免费在线工具，从AI生成的像素艺术中提取干净的像素精灵。自动网格检测、颜色量化、背景移除、精灵分割。",
      "url": "https://univeous.github.io/Pixel-Extractor/",
      "applicationCategory": "GraphicsApplication",
      "operatingSystem": "Web Browser",
      "featureList": [
        "自动网格检测",
        "颜色量化（Histogram/K-Means）",
        "背景移除",
        "精灵分割",
        "前后对比",
        "PWA离线支持"
      ]
    }
  },
  ja: {
    title: "Pixel Extractor - AIピクセルアート抽出ツール | オンラインツール",
    description: "AI生成または不適切に保存されたピクセルアートからクリーンなピクセルアートスプライトを抽出する無料オンラインツール。自動グリッド検出、色量子化、背景除去、スプライト分割。PWAオフライン対応。",
    keywords: "ピクセルアート,ピクセルスプライト,AIピクセルアート,ピクセル抽出,ピクセルクリーンアップ,ゲームアセット,ピクセルグリッド,色量子化,背景除去,ピクセルツール,オンラインツール,無料ツール,AIピクセルアート修正,ピクセルアートクリーナー,ピクセルアート抽出器,スプライト抽出器,AIアートコンバーター,ピクセルアートツール,ピクセルアートエディター,ピクセルアートプロセッサー",
    locale: "ja_JP",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Pixel Extractor",
      "description": "AI生成または不適切に保存されたピクセルアートからクリーンなピクセルアートスプライトを抽出する無料オンラインツール。自動グリッド検出、色量子化、背景除去、スプライト分割。",
      "url": "https://univeous.github.io/Pixel-Extractor/",
      "applicationCategory": "GraphicsApplication",
      "operatingSystem": "Web Browser",
      "featureList": [
        "自動グリッド検出",
        "色量子化（Histogram/K-Means）",
        "背景除去",
        "スプライト分割",
        "前後比較",
        "PWAオフライン対応"
      ]
    }
  }
};

// Export all configs and base config
export { seoConfigs, baseConfig };
