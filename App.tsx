import React, { useState, useEffect, useRef, createContext } from 'react';
import { ProcessOptions, HistoryItem, WorkerStatus, ANALYSIS_DATA_VERSION } from './types';
import { DetailsModal } from './components/DetailsModal';
import { GlobalLoader } from './components/GlobalLoader';
import { LogPanel } from './components/LogPanel';
import { Sidebar } from './components/Sidebar';
import { Icons } from './components/Icons';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { UploadArea } from './components/UploadArea';
import { Locale, loadLocale, saveLocale, useTranslation } from './i18n/index';
import { loadHistoryFromDB, saveItemToDB, deleteItemFromDB } from './storage';

// Simple hash function for image data
async function hashImageData(dataUrl: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(dataUrl);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compare options for equality
function optionsEqual(a: ProcessOptions, b: ProcessOptions): boolean {
  return a.max_colors === b.max_colors &&
    a.min_sprite_size === b.min_sprite_size &&
    a.island_size_to_remove === b.island_size_to_remove &&
    a.detect_transparency_color === b.detect_transparency_color &&
    a.remove_background_color === b.remove_background_color &&
    a.default_transparency_color_hex === b.default_transparency_color_hex &&
    a.color_quantization_method === b.color_quantization_method &&
    a.edge_detection_quantization_method === b.edge_detection_quantization_method;
}

// GitHub button with star count
const GitHubButton: React.FC = () => {
  const [stars, setStars] = useState<number | null>(null);
  
  useEffect(() => {
    // Fetch star count from GitHub API
    fetch('https://api.github.com/repos/univeous/Pixel-Extractor')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count !== undefined) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);
  
  return (
    <a
      href="https://github.com/univeous/Pixel-Extractor"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 p-2 rounded-lg text-sm text-gray-400 hover:text-gray-300 hover:bg-[#3e3e42] transition-colors"
    >
      <Icons.GitHub />
      {stars !== null && (
        <>
          <span className="text-yellow-400">★</span>
          <span>{stars}</span>
        </>
      )}
    </a>
  );
};

// Network status component
const NetworkStatus: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates periodically
        const checkUpdate = () => {
          registration.update().catch(() => {});
        };
        
        // Check on load and every 5 minutes
        checkUpdate();
        const interval = setInterval(checkUpdate, 5 * 60 * 1000);
        
        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });
        
        return () => clearInterval(interval);
      });
      
      // Listen for cache cleared message
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_CLEARED') {
          window.location.reload();
        }
      });
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = async () => {
    // Don't clear cache when offline - would break the app
    if (!isOnline || isRefreshing) return;
    
    setIsRefreshing(true);
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE_AND_RELOAD' });
      // Fallback if message doesn't trigger reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || !isOnline}
        className={`p-2 rounded-lg transition-colors ${
          isRefreshing ? 'text-blue-400' :
          hasUpdate ? 'text-yellow-400 hover:bg-yellow-400/10 cursor-pointer' :
          isOnline ? 'text-green-400 hover:bg-green-400/10 cursor-pointer' : 'text-gray-500 cursor-default'
        }`}
        title={isOnline ? (hasUpdate ? t('updateAvailable') : t('online')) : t('offline')}
      >
        {isRefreshing ? <span className="animate-spin inline-block"><Icons.Refresh /></span> :
         hasUpdate ? <Icons.Update /> :
         isOnline ? <Icons.Wifi /> : <Icons.WifiOff />}
      </button>
      
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 bg-[#2d2d30] border border-[#3e3e42] rounded-lg shadow-xl p-3 z-50 min-w-[200px] text-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            <span className="text-gray-300">{isOnline ? t('online') : t('offline')}</span>
          </div>
          {hasUpdate && (
            <div className="text-yellow-400 mb-2">{t('updateAvailable')}</div>
          )}
          {isOnline && (
            <div className="text-gray-500 text-[10px] border-t border-[#3e3e42] pt-2 mt-2">
              {t('clickToRefresh')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Locale context for child components
export const LocaleContext = createContext<{ 
  locale: Locale; 
  setLocale: (l: Locale) => void; 
  t: (key: any) => string 
}>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k
});

const App: React.FC = () => {
  // Refs
  const workerRef = useRef<Worker | null>(null);
  const currentProcessingFile = useRef<{ 
    url: string; 
    width: number; 
    height: number; 
    name: string;
    usedOptions: ProcessOptions;
    startTime: number;
    imageHash?: string;
  } | null>(null);

  // State
  const [status, setStatus] = useState<WorkerStatus>('init');
  const [progress, setProgress] = useState<{ step: number; msg: string }>({ step: 0, msg: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [options, setOptions] = useState<ProcessOptions>({
    max_colors: 32,
    min_sprite_size: 8,
    island_size_to_remove: 5,
    detect_transparency_color: true,
    remove_background_color: false,
    default_transparency_color_hex: 'ff00ff',
    color_quantization_method: 'histogram',
    edge_detection_quantization_method: 'kmeans',
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  
  // i18n
  const [locale, setLocaleState] = useState<Locale>(loadLocale);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { t } = useTranslation(locale);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
    setLangMenuOpen(false);
  };
  
  const langOptions = [
    { value: 'en' as const, label: 'English' },
    { value: 'zh' as const, label: '中文' },
    { value: 'ja' as const, label: '日本語' },
  ];
  
  // Translate progress messages from Python
  const translateProgress = (msg: string): string => {
    if (msg.startsWith('processingSubregion:')) {
      const parts = msg.split(':');
      return `${t('processingSubregion')} ${parts[1]}: ${t(parts[2] as any)}`;
    }
    return t(msg as any) || msg;
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Load history on mount
  useEffect(() => {
    loadHistoryFromDB().then(items => {
      if (items.length > 0) setHistory(items);
    });
  }, []);

  // Worker lifecycle
  useEffect(() => {
    const worker = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, message, step, error, results } = e.data;
      
      switch(type) {
        case 'status':
          if (message === 'ready') {
            setStatus('ready');
            addLog('Python Environment Ready.');
          } else if (message === 'error') {
            setStatus('error');
            addLog(`Error: ${error}`);
          }
          break;
        case 'progress':
          setProgress({ step: step || 0, msg: message });
          break;
        case 'log':
          addLog(message);
          break;
        case 'result':
          if (currentProcessingFile.current) {
            const fileInfo = currentProcessingFile.current;
            const processingTime = Date.now() - fileInfo.startTime;
            const newItem: HistoryItem = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              originalImage: fileInfo.url,
              originalWidth: fileInfo.width,
              originalHeight: fileInfo.height,
              results: results || [],
              options: fileInfo.usedOptions,
              processingTime,
              imageHash: fileInfo.imageHash,
              dataVersion: ANALYSIS_DATA_VERSION
            };
            
            setHistory(prev => [newItem, ...prev]);
            saveItemToDB(newItem);
            setSelectedHistoryItem(newItem);
            setStatus('ready');
            setProgress({ step: 100, msg: t('complete') });
            addLog(`Extracted ${results?.length || 0} sprites in ${(processingTime / 1000).toFixed(1)}s.`);
            currentProcessingFile.current = null;
          } else {
            setStatus('ready');
          }
          break;
      }
    };

    worker.postMessage({ type: 'init' });
    return () => worker.terminate();
  }, []);

  const triggerProcess = async (file: File) => {
    if (status !== 'ready' && status !== 'error' && status !== 'init') return;
    setStatus('processing');
    setProgress({ step: 0, msg: t('readingFile') });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      
      // Calculate hash and check for existing identical result
      const imageHash = await hashImageData(dataUrl);
      const existingItem = history.find(item => 
        item.imageHash === imageHash && 
        item.dataVersion === ANALYSIS_DATA_VERSION &&
        optionsEqual(item.options, options)
      );
      
      if (existingItem) {
        // Found identical previous result, just open it
        setStatus('ready');
        setSelectedHistoryItem(existingItem);
        addLog(t('foundCachedResult'));
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setStatus('error');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        currentProcessingFile.current = {
          url: dataUrl,
          width: img.width,
          height: img.height,
          name: file.name,
          usedOptions: { ...options },
          startTime: Date.now(),
          imageHash
        };
        
        const buffer = imageData.data.buffer.slice(0);
        workerRef.current?.postMessage({
          type: 'process',
          pixelBuffer: buffer,
          width: img.width,
          height: img.height,
          options: options
        }, [buffer]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleHistoryDelete = (id: string) => {
    setHistory(h => h.filter(x => x.id !== id));
    deleteItemFromDB(id);
    if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null);
  };

  // Reprocess original image from history with current options
  const handleReprocessOriginal = (item: HistoryItem) => {
    if (status !== 'ready' && status !== 'error') return;
    
    // Convert data URL to File and process
    fetch(item.originalImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'reprocess.png', { type: 'image/png' });
        triggerProcess(file);
      });
  };

  // Reprocess a result sprite from history with current options
  const handleReprocessResult = (item: HistoryItem, spriteIndex: number) => {
    if (status !== 'ready' && status !== 'error') return;
    
    const sprite = item.results[spriteIndex];
    if (!sprite) return;
    
    // Create a canvas to convert sprite data to image
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.createImageData(sprite.width, sprite.height);
    imageData.data.set(sprite.sprite_data);
    ctx.putImageData(imageData, 0, 0);
    
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'reprocess-sprite.png', { type: 'image/png' });
        triggerProcess(file);
      }
    }, 'image/png');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e1e] text-gray-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      {status === 'init' && <GlobalLoader logs={logs} />}

      {/* Header */}
      <header className="h-14 bg-[#252526] border-b border-[#3e3e42] flex items-center px-4 shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-white">{t('appTitle')}</h1>
          <span 
            className="text-[10px] text-gray-500 font-mono"
            title={`Version: ${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}`}
          >
            {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : status === 'processing' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="opacity-70">
            {status === 'init' ? t('statusLoading') : status === 'processing' ? t('statusProcessing') : t('statusReady')}
          </span>
        </div>
        <div className="flex-1"></div>
        
        {/* Network Status */}
        <NetworkStatus t={t} />
        
        {/* GitHub Button */}
        <GitHubButton />
        
        {/* Language Switcher */}
        <div className="relative ml-2">
          <button 
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            onBlur={() => setTimeout(() => setLangMenuOpen(false), 150)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#3c3c3c] border border-[#3e3e42] rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-[#444] hover:border-[#505055] transition-colors"
          >
            <Icons.Globe />
            <span>{langOptions.find(l => l.value === locale)?.label}</span>
            <Icons.ChevronDown />
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#2d2d30] border border-[#3e3e42] rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]">
              {langOptions.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => setLocale(lang.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${locale === lang.value ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-[#3e3e42]'}`}
                >
                  <span>{lang.label}</span>
                  {locale === lang.value && <span className="ml-auto text-blue-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar 
          options={options}
          setOptions={setOptions}
          history={history}
          onHistorySelect={setSelectedHistoryItem}
          onHistoryDelete={handleHistoryDelete}
          onReprocessOriginal={handleReprocessOriginal}
          onReprocessResult={handleReprocessResult}
          t={t}
        />

        <main className="flex-1 flex flex-col relative min-h-0">
          <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
            {status === 'processing' && currentProcessingFile.current && (
              <ProcessingOverlay 
                imageUrl={currentProcessingFile.current.url}
                imageWidth={currentProcessingFile.current.width}
                imageHeight={currentProcessingFile.current.height}
                progressMsg={translateProgress(progress.msg)}
                progressStep={progress.step}
              />
            )}
            <UploadArea status={status} onFileSelect={triggerProcess} t={t} />
          </div>
          <LogPanel logs={logs} status={status} />
        </main>
      </div>

      {selectedHistoryItem && (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
          <DetailsModal 
            item={selectedHistoryItem} 
            onClose={() => setSelectedHistoryItem(null)} 
          />
        </LocaleContext.Provider>
      )}
    </div>
  );
};

export default App;
