import type { Plugin } from 'vite';
import { seoConfigs, baseConfig } from './seo.config';

const langMap: Record<string, string> = {
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja'
};

// Default to English for primary meta tags
const defaultLocale: 'en' | 'zh' | 'ja' = 'en';
const defaultConfig = seoConfigs[defaultLocale];

export function vitePluginSEO(): Plugin {
  return {
    name: 'vite-plugin-seo',
    transformIndexHtml(html: string) {
      const { url, image, siteName, languages, author } = baseConfig;
      const { title, description, keywords, locale } = defaultConfig;
      
      // Update HTML lang attribute (use default locale)
      const htmlLang = langMap[defaultLocale] || 'en';
      html = html.replace(/<html lang="[^"]*">/, `<html lang="${htmlLang}">`);
      
      // Generate multi-language Open Graph alternate locales
      const ogAlternateLocales = Object.entries(seoConfigs)
        .filter(([lang]) => lang !== defaultLocale)
        .map(([lang, config]) => {
          const ogLocale = lang === 'zh' ? 'zh_CN' : 'ja_JP';
          return `    <meta property="og:locale:alternate" content="${ogLocale}">`;
        }).join('\n');
      
      // Generate additional Open Graph tags for other languages
      const ogMultiLang = Object.entries(seoConfigs)
        .filter(([lang]) => lang !== defaultLocale)
        .map(([lang, config]) => {
          const ogLocale = lang === 'zh' ? 'zh_CN' : 'ja_JP';
          return `    <meta property="og:title" content="${config.title}" data-lang="${lang}">
    <meta property="og:description" content="${config.description}" data-lang="${lang}">`;
        }).join('\n');
      
      // Generate multi-language structured data
      const structuredDataArray = Object.entries(seoConfigs).map(([lang, config]) => ({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": config.structuredData.name,
        "description": config.structuredData.description,
        "url": config.structuredData.url,
        "inLanguage": lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'ja-JP',
        "applicationCategory": config.structuredData.applicationCategory,
        "operatingSystem": config.structuredData.operatingSystem,
        "featureList": config.structuredData.featureList
      }));
      
      // Generate meta tags
      const metaTags = `
    <!-- Primary Meta Tags (Default: ${defaultLocale.toUpperCase()}) -->
    <title>${title}</title>
    <meta name="title" content="${title}">
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="${author}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    
    <!-- Alternate Languages -->
${languages.map(lang => `    <link rel="alternate" hreflang="${lang.code}" href="${lang.href}">`).join('\n')}
    <link rel="alternate" hreflang="x-default" href="${url}">
    
    <!-- Open Graph / Facebook (Primary) -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:locale" content="${locale}">
${ogAlternateLocales}
    <meta property="og:site_name" content="${siteName}">
    
    <!-- Open Graph Multi-language (for crawlers that support data-lang) -->
${ogMultiLang}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${url}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${image}">
    
    <!-- Structured Data (JSON-LD) - Multi-language -->
    <script type="application/ld+json">
    ${JSON.stringify(structuredDataArray, null, 2)}
    </script>`;

      // Replace the placeholder or insert after theme-color meta
      if (html.includes('<!-- SEO_PLACEHOLDER -->')) {
        return html.replace('<!-- SEO_PLACEHOLDER -->', metaTags);
      } else {
        // Insert after theme-color meta tag
        return html.replace(
          /(<meta name="theme-color"[^>]*>)/,
          `$1${metaTags}`
        );
      }
    }
  };
}
