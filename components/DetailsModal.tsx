import React, { useState, useEffect, useRef, useContext } from 'react';
import { Icons } from './Icons';
import { SpriteCanvas } from './SpriteCanvas';
import { PaletteDisplay } from './PaletteDisplay';
import { PanZoomContainer } from './PanZoomContainer';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { AnalysisPanel } from './AnalysisPanel';
import { HistoryItem, ViewMode } from '../types';
import { LocaleContext } from '../App';

export const DetailsModal: React.FC<{ 
    item: HistoryItem; 
    onClose: () => void; 
}> = ({ item, onClose }) => {
    const { t } = useContext(LocaleContext);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [selectedSpriteIndex, setSelectedSpriteIndex] = useState(0);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [stretchOriginal, setStretchOriginal] = useState(true);
    const sprite = item.results && item.results[selectedSpriteIndex];
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // If analysis is open, close it first; otherwise close modal
                if (showAnalysis) {
                    setShowAnalysis(false);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, showAnalysis]);

    // Initial Fit
    useEffect(() => {
        if (sprite && containerRef.current) {
            handleFit();
        }
    }, [sprite, viewMode]);

    const handleZoomMultiplier = (multiplier: number) => {
        setZoom(z => {
            const newZoom = z * multiplier;
            return Math.max(0.1, Math.min(64, newZoom));
        });
    };
    
    const handleZoomStep = (direction: 'in' | 'out') => {
        setZoom(z => {
            if (direction === 'in') return Math.min(64, z * 1.5);
            return Math.max(0.1, z / 1.5);
        });
    };

    const handleFit = () => {
        if (!sprite || !containerRef.current) return;
        
        setPan({ x: 0, y: 0 });

        const rect = containerRef.current.getBoundingClientRect();
        const availableW = rect.width * 0.9;
        const availableH = rect.height * 0.9;
        
        let contentW, contentH;

        if (viewMode === 'original') {
            contentW = item.originalWidth;
            contentH = item.originalHeight;
        } else if (viewMode === 'split') {
            contentW = sprite.width * sprite.grid_size_x;
            contentH = sprite.height * sprite.grid_size_y;
        } else {
            contentW = sprite.width;
            contentH = sprite.height;
        }

        const wRatio = availableW / contentW;
        const hRatio = availableH / contentH;
        
        const fitZoom = Math.min(wRatio, hRatio);
        setZoom(fitZoom);
    };

    if (!sprite) return null;

    const baseW = Math.round(sprite.grid_span_w);
    const baseH = Math.round(sprite.grid_span_h);

    // Analysis full-screen overlay
    if (showAnalysis) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                <div className="bg-[#1e1e1e] border border-[#3e3e42] rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                    <AnalysisPanel 
                        sprite={sprite} 
                        onBack={() => setShowAnalysis(false)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-[#252526] border border-[#3e3e42] rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden flex-col md:flex-row"
                onClick={e => e.stopPropagation()}
            >
                {/* Left: Comparison View */}
                <div ref={containerRef} className="flex-1 bg-[#1e1e1e] relative overflow-hidden flex flex-col min-h-0">
                    {/* Top Bar: Zoom & Tabs */}
                    <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
                         <div className="bg-[#252526] border border-[#3e3e42] rounded p-1 flex gap-1 shadow-lg pointer-events-auto items-center">
                             <button onClick={() => handleZoomStep('out')} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><Icons.ZoomOut /></button>
                             <button onClick={handleFit} className="text-xs font-mono self-center px-2 w-16 text-center text-gray-300 hover:text-white hover:bg-[#3e3e42] rounded h-full flex items-center justify-center transition-colors" title="Fit & Center">
                                 {zoom.toFixed(2)}x
                             </button>
                             <button onClick={() => handleZoomStep('in')} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"><Icons.ZoomIn /></button>
                             <div className="w-[1px] h-4 bg-[#3e3e42] mx-1"></div>
                             <button onClick={handleFit} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white" title="Fit to Screen"><Icons.Fit /></button>
                         </div>

                         <div className="flex gap-2">
                            {viewMode === 'split' && (
                                <div className="bg-[#252526] border border-[#3e3e42] rounded p-1 flex gap-1 shadow-lg pointer-events-auto">
                                    <button 
                                        onClick={() => setStretchOriginal(!stretchOriginal)} 
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${stretchOriginal ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-[#3e3e42]'}`}
                                        title="Stretch original to match processed pixels"
                                    >
                                        {t('stretch')}
                                    </button>
                                </div>
                            )}
                            <div className="bg-[#252526] border border-[#3e3e42] rounded p-1 flex gap-1 shadow-lg pointer-events-auto">
                                <button 
                                    onClick={() => setViewMode('split')} 
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#3e3e42]'}`}
                                >
                                    <Icons.Split /> {t('split')}
                                </button>
                                <button 
                                    onClick={() => setViewMode('original')} 
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${viewMode === 'original' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#3e3e42]'}`}
                                >
                                    <Icons.Image /> {t('original')}
                                </button>
                                <button 
                                    onClick={() => setViewMode('result')} 
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${viewMode === 'result' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#3e3e42]'}`}
                                >
                                    <Icons.Eye /> {t('result')}
                                </button>
                            </div>
                         </div>
                    </div>
                    
                    <PanZoomContainer 
                        className="flex-1 h-full w-full" 
                        onZoomChange={handleZoomMultiplier}
                        pan={pan}
                        onPanChange={setPan}
                    >
                        {viewMode === 'split' && (
                            <BeforeAfterSlider 
                                originalSrc={item.originalImage}
                                spriteData={sprite.sprite_data}
                                spriteWidth={sprite.width}
                                spriteHeight={sprite.height}
                                spriteContentX={sprite.content_x}
                                spriteContentY={sprite.content_y}
                                gridSizeX={sprite.grid_size_x}
                                gridSizeY={sprite.grid_size_y}
                                gridOriginX={sprite.grid_origin_x}
                                gridOriginY={sprite.grid_origin_y}
                                gridSpanW={sprite.grid_span_w}
                                gridSpanH={sprite.grid_span_h}
                                zoom={zoom}
                                stretchOriginal={stretchOriginal}
                            />
                        )}

                        {viewMode === 'original' && (
                            <div className="relative">
                                <img 
                                    src={item.originalImage}
                                    style={{ 
                                        width: item.originalWidth * zoom, 
                                        height: item.originalHeight * zoom,
                                        imageRendering: 'pixelated'
                                    }}
                                    draggable={false}
                                    className="shadow-2xl pointer-events-auto max-w-none select-none block"
                                />
                            </div>
                        )}

                        {viewMode === 'result' && (
                            <div className="relative shadow-2xl bg-[#222]" 
                                style={{
                                    backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                }}>
                                <SpriteCanvas 
                                    data={sprite.sprite_data} 
                                    width={sprite.width} 
                                    height={sprite.height} 
                                    style={{ width: sprite.width * zoom, height: sprite.height * zoom }}
                                />
                            </div>
                        )}
                    </PanZoomContainer>
                    
                    {/* Sprite Selector if multiple */}
                    {item.results.length > 1 && (
                        <div className="h-24 bg-[#252526] border-t border-[#3e3e42] flex items-center gap-2 p-2 overflow-x-auto shrink-0 z-20">
                            {item.results.map((res, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setSelectedSpriteIndex(idx)}
                                    className={`w-20 h-20 shrink-0 border rounded cursor-pointer p-1 flex items-center justify-center bg-[#1e1e1e] ${selectedSpriteIndex === idx ? 'border-blue-500 ring-1 ring-blue-500' : 'border-[#3e3e42] hover:border-gray-500'}`}
                                >
                                    <SpriteCanvas data={res.sprite_data} width={res.width} height={res.height} style={{ width: 64, height: 64, objectFit: 'contain' }} className="pointer-events-none" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Info Panel */}
                <div className="w-full md:w-80 bg-[#252526] border-l border-[#3e3e42] flex flex-col shrink-0">
                     <div className="h-14 border-b border-[#3e3e42] flex items-center justify-between px-4">
                         <h3 className="font-bold text-white">{t('details')}</h3>
                         <button onClick={onClose} className="text-gray-400 hover:text-white"><Icons.Close /></button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-4 space-y-6">
                         
                         {/* Dimensions */}
                         <div className="bg-[#1e1e1e] p-3 rounded border border-[#3e3e42]">
                             <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('dimensions')} <span className="normal-case font-normal">(px)</span></div>
                             <div className="grid grid-cols-3 gap-3 text-center">
                                 <div className="flex flex-col items-center justify-end">
                                     <div className="font-mono text-white text-center leading-none">
                                         <div className="text-sm">{sprite.width}</div>
                                         <div className="text-[8px] text-gray-400 -my-1">×</div>
                                         <div className="text-sm">{sprite.height}</div>
                                     </div>
                                     <div className="text-[10px] text-gray-500 mt-0.5">{t('result')}</div>
                                 </div>
                                 <div className="flex flex-col items-center justify-end">
                                     <div className="font-mono text-gray-400 text-center leading-none">
                                         <div className="text-sm">{baseW}</div>
                                         <div className="text-[8px] text-gray-500 -my-1">×</div>
                                         <div className="text-sm">{baseH}</div>
                                     </div>
                                     <div className="text-[10px] text-gray-500 mt-0.5">{t('originalCrop')}</div>
                                 </div>
                                 <div className="flex flex-col items-center justify-end">
                                     <div className="font-mono text-blue-400 text-center leading-none">
                                         <div className="text-sm">{sprite.grid_size_x.toFixed(1)}</div>
                                         <div className="text-[8px] text-blue-300 -my-1">×</div>
                                         <div className="text-sm">{sprite.grid_size_y.toFixed(1)}</div>
                                     </div>
                                     <div className="text-[10px] text-gray-500 mt-0.5">{t('gridSize')}</div>
                                 </div>
                             </div>
                         </div>

                         {/* Palette */}
                         <div>
                             <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('paletteDetected')}</div>
                             <PaletteDisplay data={sprite.sprite_data} width={sprite.width} height={sprite.height} />
                         </div>

                         {/* Used Params */}
                         <div className="space-y-2 text-xs">
                             <div className="text-gray-500 uppercase font-bold mb-2">{t('generationParams')}</div>
                             <div className="flex justify-between border-b border-[#3e3e42] pb-1">
                                 <span className="text-gray-400">{t('maxColors')}</span>
                                 <span>{item.options.max_colors}</span>
                             </div>
                             <div className="flex justify-between border-b border-[#3e3e42] pb-1">
                                 <span className="text-gray-400">{t('minSpriteSize')}</span>
                                 <span>{item.options.min_sprite_size}px</span>
                             </div>
                             <div className="flex justify-between border-b border-[#3e3e42] pb-1">
                                 <span className="text-gray-400">{t('islandRemovalSize')}</span>
                                 <span>{item.options.island_size_to_remove}</span>
                             </div>
                             <div className="flex justify-between border-b border-[#3e3e42] pb-1">
                                 <span className="text-gray-400">{t('colorSampling')}</span>
                                 <span className="capitalize">{item.options.color_quantization_method}</span>
                             </div>
                             <div className="flex justify-between pb-1">
                                 <span className="text-gray-400">{t('edgeDetection')}</span>
                                 <span className="capitalize">{item.options.edge_detection_quantization_method}</span>
                             </div>
                         </div>

                        {sprite.analysis && (
                            <div className="border-t border-[#3e3e42] pt-3 !mt-3">
                                <button 
                                    onClick={() => setShowAnalysis(true)}
                                    className="w-full text-gray-400 hover:text-white bg-[#3c3c3c] hover:bg-[#444] border border-[#3e3e42] rounded py-2 flex items-center gap-2 justify-center transition-colors"
                                >
                                    <Icons.Settings /><span>{t('debugInfo')}</span>
                                </button>
                            </div>
                        )}

                        <div className="border-t border-[#3e3e42] pt-3 !mt-3 space-y-2">
                            <button 
                                className="w-full bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 py-2 rounded border border-[#3e3e42] transition-colors flex items-center gap-2 justify-center"
                                onClick={() => {
                                   const link = document.createElement('a');
                                   link.download = `original_${item.id}.png`;
                                   link.href = item.originalImage;
                                   link.click();
                                }}
                            >
                                <Icons.Download /><span>{t('downloadOriginal')}</span>
                            </button>
                            <button 
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded shadow-lg transition-colors flex items-center gap-2 justify-center"
                                onClick={() => {
                                   const link = document.createElement('a');
                                   const canvas = document.createElement('canvas');
                                   canvas.width = sprite.width;
                                   canvas.height = sprite.height;
                                   const ctx = canvas.getContext('2d');
                                   if (ctx) {
                                       const imgData = ctx.createImageData(sprite.width, sprite.height);
                                       imgData.data.set(sprite.sprite_data);
                                       ctx.putImageData(imgData, 0, 0);
                                       link.download = `processed_${item.id}.png`;
                                       link.href = canvas.toDataURL();
                                       link.click();
                                   }
                                }}
                            >
                                <Icons.Download /><span>{t('downloadProcessed')}</span>
                            </button>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};
