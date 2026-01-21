
import React, { useState, useEffect, useRef } from 'react';
import { ProcessOptions, HistoryItem, WorkerStatus } from './types';
import { Icons } from './components/Icons';
import { DetailsModal } from './components/DetailsModal';
import { GlobalLoader } from './components/GlobalLoader';
import { LogPanel } from './components/LogPanel';

// --- Main App ---

const App: React.FC = () => {
  // --- State ---
  const workerRef = useRef<Worker | null>(null);
  const currentProcessingFile = useRef<{ 
      url: string; 
      width: number; 
      height: number; 
      name: string;
      usedOptions: ProcessOptions;
  } | null>(null);

  const [status, setStatus] = useState<WorkerStatus>('init');
  const [progress, setProgress] = useState<{ step: number; msg: string }>({ step: 0, msg: 'Connecting to Pyodide...' });
  const [logs, setLogs] = useState<string[]>([]);
  
  const [options, setOptions] = useState<ProcessOptions>({
    max_colors: 32,
    min_sprite_size: 8,
    island_size_to_remove: 5,
    detect_transparency_color: true,
    default_transparency_color_hex: 'ff00ff',
    color_quantization_method: 'histogram',
    edge_detection_quantization_method: 'kmeans',
  });
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);

  // --- Worker Lifecycle ---
  useEffect(() => {
    const worker = new Worker('worker.js');
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
             // NOTE: results is now guaranteed to be an array of objects by the worker fix
             const newItem: HistoryItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                originalImage: fileInfo.url,
                originalWidth: fileInfo.width,
                originalHeight: fileInfo.height,
                results: results || [],
                options: fileInfo.usedOptions
             };
             
             setHistory(prev => [newItem, ...prev]);
             // Automatically open the new result
             setSelectedHistoryItem(newItem);
             
             setStatus('ready');
             setProgress({ step: 100, msg: 'Complete!' });
             addLog(`Extracted ${results?.length || 0} sprites.`);
             
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

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-99), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const triggerProcess = (file: File) => {
     if (status !== 'ready' && status !== 'error' && status !== 'init') return;
     setStatus('processing');
     setProgress({ step: 0, msg: 'Reading file...' });
     
     const reader = new FileReader();
     reader.onload = (e) => {
         const img = new Image();
         img.onload = () => {
             const canvas = document.createElement('canvas');
             canvas.width = img.width;
             canvas.height = img.height;
             const ctx = canvas.getContext('2d');
             if(!ctx) {
                 setStatus('error');
                 return;
             }
             ctx.drawImage(img, 0, 0);
             const imageData = ctx.getImageData(0, 0, img.width, img.height);
             
             currentProcessingFile.current = {
                 url: e.target?.result as string,
                 width: img.width,
                 height: img.height,
                 name: file.name,
                 usedOptions: { ...options }
             };
             
             workerRef.current?.postMessage({
                 type: 'process',
                 pixelArray: Array.from(imageData.data),
                 width: img.width,
                 height: img.height,
                 options: options
             });
         };
         img.src = e.target?.result as string;
     }
     reader.readAsDataURL(file);
  }

  return (
    <div className="flex h-screen w-full bg-[#1e1e1e] text-gray-300 font-sans selection:bg-blue-500/30">
      
      {/* Global Loader */}
      {status === 'init' && <GlobalLoader logs={logs} />}

      {/* --- Sidebar (Left) --- */}
      <aside className="w-80 bg-[#252526] border-r border-[#3e3e42] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#3e3e42]">
            <h1 className="text-xl font-bold text-white mb-1">Pixel Extractor</h1>
            <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : status === 'processing' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="opacity-70">{status === 'init' ? 'Loading WASM...' : status === 'processing' ? 'Processing...' : 'Ready'}</span>
            </div>
        </div>

        {/* Configuration Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Icons.Settings /> Configuration
            </h2>
            
            <div className="space-y-1">
                <label className="text-xs block">Max Colors</label>
                <input 
                    type="number" value={options.max_colors}
                    onChange={e => setOptions({...options, max_colors: parseInt(e.target.value)})}
                    className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs block">Min Sprite Size</label>
                <input 
                    type="number" value={options.min_sprite_size}
                    onChange={e => setOptions({...options, min_sprite_size: parseInt(e.target.value)})}
                    className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-sm outline-none"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs block">Island Removal Size</label>
                <input 
                    type="number" value={options.island_size_to_remove}
                    onChange={e => setOptions({...options, island_size_to_remove: parseInt(e.target.value)})}
                    className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-sm outline-none"
                />
            </div>

            {/* New Parameters */}
            <div className="space-y-1">
                <label className="text-xs block">Color Sampling</label>
                <select 
                    value={options.color_quantization_method}
                    onChange={e => setOptions({...options, color_quantization_method: e.target.value as any})}
                    className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-sm outline-none cursor-pointer"
                >
                    <option value="histogram">Histogram (Faster)</option>
                    <option value="kmeans">K-Means (Better)</option>
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-xs block">Edge Detection Method</label>
                <select 
                    value={options.edge_detection_quantization_method}
                    onChange={e => setOptions({...options, edge_detection_quantization_method: e.target.value as any})}
                    className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-sm outline-none cursor-pointer"
                >
                    <option value="kmeans">K-Means</option>
                    <option value="histogram">Histogram</option>
                </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <input 
                    type="checkbox" id="trans" checked={options.detect_transparency_color}
                    onChange={e => setOptions({...options, detect_transparency_color: e.target.checked})}
                    className="rounded bg-[#3c3c3c] border-[#3e3e42]"
                />
                <label htmlFor="trans" className="text-sm cursor-pointer select-none">Auto Detect Alpha</label>
            </div>

             <div className="space-y-1">
                 <label className="text-xs block text-gray-500">Fallback Transparency Color</label>
                 <div className="flex gap-2">
                    <input 
                       type="color" 
                       value={'#'+options.default_transparency_color_hex}
                       onChange={e => setOptions({...options, default_transparency_color_hex: e.target.value.replace('#','')})}
                       className="h-8 w-10 bg-transparent border-none cursor-pointer p-0"
                    />
                    <input 
                        type="text" 
                        value={options.default_transparency_color_hex}
                        onChange={e => setOptions({...options, default_transparency_color_hex: e.target.value.replace('#','')})}
                        className="flex-1 bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-sm uppercase font-mono"
                    />
                 </div>
              </div>
        </div>
        
        {/* History List (Pinned to Bottom) */}
        <div className="h-64 border-t border-[#3e3e42] flex flex-col">
             <div className="p-2 bg-[#2d2d30] border-b border-[#3e3e42] text-xs font-bold uppercase tracking-wider text-gray-500">
                History
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {history.length === 0 && <p className="text-xs text-gray-600 italic text-center py-4">No history.</p>}
                {history.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedHistoryItem(item)}
                    className="group p-2 rounded cursor-pointer hover:bg-[#37373d] transition-colors border border-transparent hover:border-[#3e3e42] flex items-center gap-3"
                  >
                      <img src={item.originalImage} className="w-10 h-10 object-contain bg-black/20 rounded" alt="thumb" />
                      <div className="flex-1 min-w-0">
                         <div className="text-xs font-medium truncate text-white">#{item.id.slice(-4)}</div>
                         <div className="text-[10px] text-gray-500">{item.results.length} sprites</div>
                      </div>
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setHistory(h => h.filter(x => x.id !== item.id)); 
                            if(selectedHistoryItem?.id === item.id) setSelectedHistoryItem(null); 
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1"
                      >
                          <Icons.Trash />
                      </button>
                  </div>
                ))}
             </div>
        </div>
      </aside>

      {/* --- Main Content (Upload Area + Logs) --- */}
      <main className="flex-1 flex flex-col relative min-h-0">
         
         {/* Container for Processing Overlay + Upload Area */}
         <div className="flex-1 relative flex flex-col">
            {/* Status Overlay - Scoped to this container only */}
            {status === 'processing' && (
                <div className="absolute inset-0 bg-[#1e1e1e]/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-80 bg-[#252526] border border-[#3e3e42] rounded-lg p-6 shadow-2xl text-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="text-white font-medium mb-1 truncate">{progress.msg}</div>
                        <div className="text-xs text-gray-500 mb-2 font-mono">STEP {Math.round(progress.step)}%</div>
                        <div className="w-full bg-[#3e3e42] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${progress.step}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            <div 
                className={`flex-1 flex flex-col items-center justify-center border-4 border-dashed m-8 rounded-3xl transition-all cursor-pointer ${status === 'ready' ? 'border-[#3e3e42] hover:border-blue-500 hover:bg-blue-500/5' : 'border-red-900/50 opacity-50'}`}
                onClick={() => document.getElementById('file-upload')?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                    e.preventDefault();
                    if(e.dataTransfer.files[0]) triggerProcess(e.dataTransfer.files[0]);
                }}
            >
                <input type="file" id="file-upload" className="hidden" accept="image/png,image/jpeg" onChange={e => e.target.files?.[0] && triggerProcess(e.target.files[0])} />
                <div className="p-6 bg-[#252526] rounded-full mb-6 text-blue-500 shadow-2xl transform hover:scale-110 transition-transform">
                    <Icons.Upload />
                </div>
                <h3 className="text-3xl font-light text-white mb-2">Upload Pixel Art</h3>
                <p className="text-gray-500 text-lg">Drag & drop or click to browse</p>
                <p className="text-xs text-gray-600 mt-4 font-mono">PNG / JPG Supported</p>
            </div>
         </div>

         {/* Logs Panel - Outside the relative container, so it stays visible */}
         <LogPanel logs={logs} status={status} />
         
      </main>

      {/* --- Details Modal --- */}
      {selectedHistoryItem && (
          <DetailsModal 
             item={selectedHistoryItem} 
             onClose={() => setSelectedHistoryItem(null)} 
          />
      )}
    </div>
  );
};

export default App;
