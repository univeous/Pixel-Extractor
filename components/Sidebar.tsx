import React, { useState } from 'react';
import { Icons } from './Icons';
import { ProcessOptions, HistoryItem } from '../types';
import { TranslationKey } from '../i18n/index';

interface SidebarProps {
  options: ProcessOptions;
  setOptions: (options: ProcessOptions) => void;
  history: HistoryItem[];
  onHistorySelect: (item: HistoryItem) => void;
  onHistoryDelete: (id: string) => void;
  onReprocessOriginal?: (item: HistoryItem) => void;
  onReprocessResult?: (item: HistoryItem, spriteIndex: number) => void;
  t: (key: TranslationKey) => string;
}

// Context menu state
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: HistoryItem | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  options, setOptions, history, onHistorySelect, onHistoryDelete, onReprocessOriginal, onReprocessResult, t
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, item: null });
  const contextMenuRef = React.useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent, item: HistoryItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate menu position, adjusting if it would go off-screen
    const menuHeight = 150; // Approximate menu height
    const menuWidth = 220;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 5;
    }
    
    // Adjust if menu would go off bottom edge - only raise enough to fit
    const overflow = (y + menuHeight) - window.innerHeight;
    if (overflow > 0) {
      y = y - overflow - 5;
    }
    
    setContextMenu({ visible: true, x, y, item });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, item: null });
  };

  // Close context menu when clicking outside or pressing Escape
  React.useEffect(() => {
    if (contextMenu.visible) {
      const handleClick = () => closeContextMenu();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeContextMenu();
      };
      window.addEventListener('click', handleClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [contextMenu.visible]);
  return (
    <aside className="w-80 bg-[#252526] border-r border-[#3e3e42] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Configuration Area */}
      <div className="p-4 space-y-4 overflow-y-auto shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
          <Icons.Settings /> {t('configuration')}
        </h2>
        
        {/* Max Colors */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs block">
              {t('maxColors')}
            </label>
            <input 
              type="number" 
              value={options.max_colors}
              onChange={e => setOptions({...options, max_colors: Math.max(2, parseInt(e.target.value) || 2)})}
              className="w-12 bg-[#3c3c3c] border border-[#3e3e42] rounded px-1 py-0.5 text-xs text-right outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <input 
            type="range" min="2" max="256" 
            value={options.max_colors}
            onChange={e => setOptions({...options, max_colors: parseInt(e.target.value)})}
            className="w-full h-1 bg-[#3e3e42] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex gap-1 justify-between">
            {[16, 32, 48, 64, 96, 128, 256].map(val => (
              <button 
                key={val}
                onClick={() => setOptions({...options, max_colors: val})}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${options.max_colors === val ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-[#3c3c3c] border-[#3e3e42] text-gray-400 hover:bg-[#444]'}`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Min Sprite Size */}
        <div className="space-y-2">
          <div className="flex justify-between items-center group relative">
            <label className="text-xs block flex items-center gap-1 cursor-help">
              {t('minSpriteSize')}
              <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
              <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
                {t('minSpriteSizeHelp')}
              </div>
            </label>
            <input 
              type="number" 
              value={options.min_sprite_size}
              onChange={e => setOptions({...options, min_sprite_size: Math.max(1, parseInt(e.target.value) || 1)})}
              className="w-12 bg-[#3c3c3c] border border-[#3e3e42] rounded px-1 py-0.5 text-xs text-right outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <input 
            type="range" min="1" max="128" 
            value={options.min_sprite_size}
            onChange={e => setOptions({...options, min_sprite_size: parseInt(e.target.value)})}
            className="w-full h-1 bg-[#3e3e42] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Island Removal */}
        <div className="space-y-2">
          <div className="flex justify-between items-center group relative">
            <label className="text-xs block flex items-center gap-1 cursor-help">
              {t('islandRemovalSize')}
              <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
                {t('islandRemovalSizeHelp')}
              </div>
            </label>
            <input 
              type="number" 
              value={options.island_size_to_remove}
              onChange={e => setOptions({...options, island_size_to_remove: Math.max(0, parseInt(e.target.value) || 0)})}
              className="w-12 bg-[#3c3c3c] border border-[#3e3e42] rounded px-1 py-0.5 text-xs text-right outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <input 
            type="range" min="0" max="50" 
            value={options.island_size_to_remove}
            onChange={e => setOptions({...options, island_size_to_remove: parseInt(e.target.value)})}
            className="w-full h-1 bg-[#3e3e42] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Color Sampling */}
        <div className="space-y-2 group relative">
          <label className="text-xs block flex items-center gap-1 cursor-help">
            {t('colorSampling')}
            <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
              {t('colorSamplingHelp')}
            </div>
          </label>
          <div className="flex bg-[#3c3c3c] p-0.5 rounded border border-[#3e3e42]">
            <button 
              onClick={() => setOptions({...options, color_quantization_method: 'histogram'})}
              className={`flex-1 text-[10px] py-1 rounded transition-colors ${options.color_quantization_method === 'histogram' ? 'bg-[#505055] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {t('histogram')}
            </button>
            <button 
              onClick={() => setOptions({...options, color_quantization_method: 'kmeans'})}
              className={`flex-1 text-[10px] py-1 rounded transition-colors ${options.color_quantization_method === 'kmeans' ? 'bg-[#505055] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {t('kmeans')}
            </button>
          </div>
        </div>

        {/* Edge Detection */}
        <div className="space-y-2 group relative">
          <label className="text-xs block flex items-center gap-1 cursor-help">
            {t('edgeDetection')}
            <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
              {t('edgeDetectionHelp')}
            </div>
          </label>
          <div className="flex bg-[#3c3c3c] p-0.5 rounded border border-[#3e3e42]">
            <button 
              onClick={() => setOptions({...options, edge_detection_quantization_method: 'histogram'})}
              className={`flex-1 text-[10px] py-1 rounded transition-colors ${options.edge_detection_quantization_method === 'histogram' ? 'bg-[#505055] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {t('histogram')}
            </button>
            <button 
              onClick={() => setOptions({...options, edge_detection_quantization_method: 'kmeans'})}
              className={`flex-1 text-[10px] py-1 rounded transition-colors ${options.edge_detection_quantization_method === 'kmeans' ? 'bg-[#505055] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {t('kmeans')}
            </button>
          </div>
        </div>

        {/* Remove Background Toggle */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-xs text-gray-400 flex items-center gap-1 cursor-help group relative">
            {t('removeBackgroundColor')}
            <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
              {t('removeBackgroundColorHelp')}
            </div>
          </label>
          <div 
            onClick={() => setOptions({...options, remove_background_color: !options.remove_background_color})}
            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors border ${options.remove_background_color ? 'bg-blue-600 border-blue-600' : 'bg-[#3c3c3c] border-[#3e3e42]'}`}
          >
            <div className={`absolute top-px left-px w-4 h-4 bg-white rounded-full transition-all shadow-sm ${options.remove_background_color ? 'translate-x-5' : 'translate-x-0'}`}></div>
          </div>
        </div>

        {options.remove_background_color && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-2">
            <div className="flex items-center justify-between pt-2">
              <label className="text-xs text-gray-400 flex items-center gap-1 cursor-help group relative">
                {t('autoDetectBackground')}
                <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
                  {t('autoDetectBackgroundHelp')}
                </div>
              </label>
              <div 
                onClick={() => setOptions({...options, detect_transparency_color: !options.detect_transparency_color})}
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors border ${options.detect_transparency_color ? 'bg-blue-600 border-blue-600' : 'bg-[#3c3c3c] border-[#3e3e42]'}`}
              >
                <div className={`absolute top-px left-px w-4 h-4 bg-white rounded-full transition-all shadow-sm ${options.detect_transparency_color ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </div>

            {!options.detect_transparency_color && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200 group relative">
                <label className="text-xs block text-gray-500 flex items-center gap-1 cursor-help">
                  {t('backgroundColor')}
                  <span className="text-gray-600 hover:text-gray-400 transition-colors"><Icons.Help /></span>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-gray-300 rounded border border-gray-700 shadow-xl z-50 pointer-events-none">
                    {t('backgroundColorHelp')}
                  </div>
                </label>
                <div className="flex items-center gap-2 bg-[#3c3c3c] border border-[#3e3e42] rounded p-1">
                  <div className="relative w-8 h-6 rounded overflow-hidden border border-gray-600/50">
                    <input 
                      type="color" 
                      value={'#'+options.default_transparency_color_hex}
                      onChange={e => setOptions({...options, default_transparency_color_hex: e.target.value.replace('#','')})}
                      className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                    />
                  </div>
                  <span className="text-gray-500 select-none">#</span>
                  <input 
                    type="text" 
                    value={options.default_transparency_color_hex}
                    onChange={e => setOptions({...options, default_transparency_color_hex: e.target.value.replace('#','')})}
                    className="flex-1 bg-transparent border-none text-sm uppercase font-mono outline-none text-white"
                    maxLength={6}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* History List */}
      <div className="border-t border-[#3e3e42] flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="p-2 bg-[#2d2d30] border-b border-[#3e3e42] text-xs font-bold uppercase tracking-wider text-gray-500 shrink-0">
          {t('history')}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {history.length === 0 && <p className="text-xs text-gray-600 italic text-center py-4">{t('noHistory')}</p>}
          {history.map(item => (
            <div 
              key={item.id}
              onClick={() => onHistorySelect(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              className="group p-2 rounded cursor-pointer hover:bg-[#37373d] transition-colors border border-transparent hover:border-[#3e3e42] flex items-center gap-3"
            >
              <img src={item.originalImage} className="w-10 h-10 object-contain bg-black/20 rounded" alt="thumb" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <div className="text-xs font-medium truncate text-white">#{item.id.slice(-4)}</div>
                  <div className="text-[10px] text-gray-500">
                    {item.results.length} {t('sprites')} · {(item.processingTime / 1000).toFixed(1)}s
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[9px] bg-[#3e3e42] px-1 rounded text-gray-400 border border-gray-600/30">
                    C:{item.options.max_colors}
                  </span>
                  <span className="text-[9px] bg-[#3e3e42] px-1 rounded text-gray-400 border border-gray-600/30">
                    Q:{item.options.color_quantization_method === 'kmeans' ? 'KM' : 'Hist'}
                  </span>
                  <span className="text-[9px] bg-[#3e3e42] px-1 rounded text-gray-400 border border-gray-600/30">
                    E:{item.options.edge_detection_quantization_method === 'kmeans' ? 'KM' : 'Hist'}
                  </span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onHistoryDelete(item.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1"
              >
                <Icons.Trash />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.item && (
        <div 
          className="fixed bg-[#2d2d30] border border-[#3e3e42] rounded-lg shadow-xl py-1 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-[#37373d] flex items-center gap-2"
            onClick={() => {
              if (onReprocessOriginal && contextMenu.item) {
                onReprocessOriginal(contextMenu.item);
              }
              closeContextMenu();
            }}
          >
            <Icons.Image />
            {t('reprocessOriginal')}
          </button>
          {contextMenu.item.results.length > 0 && (
            <>
              <div className="border-t border-[#3e3e42] my-1" />
              <div className="px-3 py-1 text-[10px] text-gray-500 uppercase">{t('reprocessResult')}</div>
              {contextMenu.item.results.map((_, idx) => (
                <button
                  key={idx}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-[#37373d] flex items-center gap-2 pl-6"
                  onClick={() => {
                    if (onReprocessResult && contextMenu.item) {
                      onReprocessResult(contextMenu.item, idx);
                    }
                    closeContextMenu();
                  }}
                >
                  Sprite #{idx + 1}
                </button>
              ))}
            </>
          )}
          <div className="border-t border-[#3e3e42] my-1" />
          <button
            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-[#37373d] flex items-center gap-2"
            onClick={() => {
              if (contextMenu.item) {
                onHistoryDelete(contextMenu.item.id);
              }
              closeContextMenu();
            }}
          >
            <Icons.Trash />
            {t('delete')}
          </button>
        </div>
      )}
    </aside>
  );
};
