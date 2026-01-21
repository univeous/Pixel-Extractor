

import React, { useState, useEffect, useRef, useContext } from 'react';
import { Icons } from './Icons';
import { SpriteCanvas } from './SpriteCanvas';
import { PaletteDisplay } from './PaletteDisplay';
import { PanZoomContainer } from './PanZoomContainer';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { HistoryItem, ViewMode } from '../types';
import { LocaleContext } from '../App';
import type { TranslationKey } from '../i18n/index';

export const DetailsModal: React.FC<{ 
    item: HistoryItem; 
    onClose: () => void; 
}> = ({ item, onClose }) => {
    const { t } = useContext(LocaleContext);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [selectedSpriteIndex, setSelectedSpriteIndex] = useState(0);
    const [showDebug, setShowDebug] = useState(false);
    const [stretchOriginal, setStretchOriginal] = useState(true);
    const sprite = item.results && item.results[selectedSpriteIndex];
    const containerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Initial Fit
    useEffect(() => {
        if (sprite && containerRef.current) {
            handleFit();
        }
    }, [sprite, viewMode]); // Re-fit when view mode changes

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
        
        // Reset Pan to Center
        setPan({ x: 0, y: 0 });

        const rect = containerRef.current.getBoundingClientRect();
        const availableW = rect.width * 0.9;
        const availableH = rect.height * 0.9;
        
        let contentW, contentH;

        if (viewMode === 'original') {
            contentW = item.originalWidth;
            contentH = item.originalHeight;
        } else if (viewMode === 'split') {
            // For split view, container shows full sprite at grid scale
            contentW = sprite.width * sprite.grid_size_x;
            contentH = sprite.height * sprite.grid_size_y;
        } else {
            // result
            contentW = sprite.width;
            contentH = sprite.height;
        }

        const wRatio = availableW / contentW;
        const hRatio = availableH / contentH;
        
        // Ensure at least 1x if possible, otherwise fit to screen
        // But for pixel art, fitting to screen usually means zooming in
        const fitZoom = Math.min(wRatio, hRatio);
        setZoom(fitZoom);
    };

    if (!sprite) return null;

    // Grid span is the area in original image that the sprite covers
    const baseW = Math.round(sprite.grid_span_w);
    const baseH = Math.round(sprite.grid_span_h);

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
                                {/* Display FULL Original Image for Context */}
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
                             <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('dimensions')}</div>
                             <div className="grid grid-cols-3 gap-3 text-center">
                                 <div>
                                     <div className="text-lg font-mono text-white">{sprite.width}x{sprite.height}</div>
                                     <div className="text-[10px] text-gray-500">{t('result')}</div>
                                 </div>
                                 <div>
                                     <div className="text-lg font-mono text-gray-400">{baseW}x{baseH}</div>
                                     <div className="text-[10px] text-gray-500">{t('originalCrop')}</div>
                                 </div>
                                <div>
                                    {(() => {
                                        const gridText = sprite.grid_size_x === sprite.grid_size_y 
                                            ? `${sprite.grid_size_x.toFixed(1)}` 
                                            : `${sprite.grid_size_x.toFixed(1)}×${sprite.grid_size_y.toFixed(1)}`;
                                        const textSize = gridText.length > 7 ? 'text-sm' : 'text-lg';
                                        return <div className={`${textSize} font-mono text-blue-400 truncate`}>{gridText}</div>;
                                    })()}
                                    <div className="text-[10px] text-gray-500">{t('gridSize')}</div>
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
                                 <span className="text-gray-400">{t('autoTransparency')}</span>
                                 <span>{item.options.detect_transparency_color ? t('on') : t('off')}</span>
                             </div>
                             <div className="flex justify-between border-b border-[#3e3e42] pb-1">
                                 <span className="text-gray-400">{t('colorSampling')}</span>
                                 <span className="capitalize">{item.options.color_quantization_method}</span>
                             </div>
                             <div className="flex justify-between border-b border-[#3e3e42] pb-1">
                                 <span className="text-gray-400">{t('edgeDetection')}</span>
                                 <span className="capitalize">{item.options.edge_detection_quantization_method}</span>
                             </div>
                         </div>

                        <div className="space-y-2">
                            <button 
                                className="w-full bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 py-2 rounded border border-[#3e3e42] transition-colors flex items-center justify-center gap-2"
                                onClick={() => {
                                   const link = document.createElement('a');
                                   link.download = `original_${item.id}.png`;
                                   link.href = item.originalImage;
                                   link.click();
                                }}
                            >
                                <Icons.Download /> {t('downloadOriginal')}
                            </button>
                            <button 
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded shadow-lg transition-colors flex items-center justify-center gap-2"
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
                                <Icons.Download /> {t('downloadProcessed')}
                            </button>
                        </div>

                        {/* Debug Info */}
                        <div className="border-t border-[#3e3e42] pt-4 mt-4">
                            <button 
                                onClick={() => setShowDebug(!showDebug)}
                                className="text-[10px] text-gray-500 hover:text-gray-400 flex items-center gap-1"
                            >
                                {showDebug ? '▼' : '▶'} {t('debugInfo')}
                            </button>
                            {showDebug && (
                                <pre className="mt-2 text-[9px] text-gray-500 bg-black/30 p-2 rounded overflow-auto max-h-48 font-mono">
{JSON.stringify({
    original: { w: item.originalWidth, h: item.originalHeight },
    sprite: { w: sprite.width, h: sprite.height },
    content: { x: sprite.content_x, y: sprite.content_y },
    grid: { 
        sizeX: sprite.grid_size_x, 
        sizeY: sprite.grid_size_y,
        originX: sprite.grid_origin_x,
        originY: sprite.grid_origin_y,
        spanW: sprite.grid_span_w,
        spanH: sprite.grid_span_h
    },
    computed: {
        spriteCoversW: sprite.width * sprite.grid_size_x,
        spriteCoversH: sprite.height * sprite.grid_size_y,
        mismatchW: sprite.grid_span_w - sprite.width * sprite.grid_size_x,
        mismatchH: sprite.grid_span_h - sprite.height * sprite.grid_size_y,
    },
    zoom
}, null, 2)}
                                </pre>
                            )}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};