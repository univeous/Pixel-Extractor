import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SpriteResult, SpriteAnalysis } from '../types';
import { Icons } from './Icons';

interface AnalysisPanelProps {
  sprite: SpriteResult;
  onBack: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ sprite, onBack }) => {
  const analysis = sprite.analysis;
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  // ESC only closes expanded chart, not the whole panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedChart) {
        e.stopPropagation();
        setExpandedChart(null);
      }
    };
    window.addEventListener('keydown', handleKey, true); // capture phase
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [expandedChart]);
  
  if (!analysis) {
    return (
      <div className="h-full flex flex-col">
        <Header onBack={onBack} showRawData={showRawData} setShowRawData={setShowRawData} />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No analysis data available
        </div>
      </div>
    );
  }

  const hasValidData = analysis.profile_x && analysis.profile_y && 
                       analysis.edges_x && analysis.edges_y &&
                       analysis.spacings_x && analysis.spacings_y;

  // Check for image data (using new field names)
  const hasEdgeImages = analysis.edges_image_x?.length && analysis.edges_image_y?.length && 
                        analysis.indexed_image_w && analysis.indexed_image_h;
  const hasGridImage = analysis.indexed_image_data?.length && 
                       analysis.indexed_image_w && analysis.indexed_image_h;

  if (!hasValidData) {
    return (
      <div className="h-full flex flex-col">
        <Header onBack={onBack} showRawData={showRawData} setShowRawData={setShowRawData} />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
          <p>Incomplete analysis data - please re-process the image</p>
          {showRawData && <RawDataPanel analysis={analysis} />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <Header onBack={onBack} showRawData={showRawData} setShowRawData={setShowRawData} />
      
      <div className="flex-1 overflow-auto p-3">
        {showRawData ? (
          <RawDataPanel analysis={analysis} />
        ) : (
          <>
            {/* Row 1: Images */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <ChartCard 
                title={`Color Deltas ${analysis.indexed_image_w || '?'}×${analysis.indexed_image_h || '?'}`}
                subtitle={hasEdgeImages ? 'R=H, G=V' : `edges_image_x: ${analysis.edges_image_x?.length || 0}`}
                onClick={() => hasEdgeImages && setExpandedChart('delta')}
                disabled={!hasEdgeImages}
              >
                {hasEdgeImages ? (
                  <ZoomableImage 
                    width={analysis.indexed_image_w!} 
                    height={analysis.indexed_image_h!}
                    renderPixels={(w, h) => {
                      const data = new Uint8ClampedArray(w * h * 4);
                      for (let i = 0; i < w * h; i++) {
                        data[i * 4] = analysis.edges_image_x![i] || 0;
                        data[i * 4 + 1] = analysis.edges_image_y![i] || 0;
                        data[i * 4 + 2] = 0;
                        data[i * 4 + 3] = 255;
                      }
                      return data;
                    }}
                    maxSize={130}
                  />
                ) : <NoData label={`edges_image_x: ${analysis.edges_image_x?.length || 'missing'}`} />}
              </ChartCard>
              <ChartCard 
                title={`Pixel Grid ${analysis.indexed_image_w || '?'}×${analysis.indexed_image_h || '?'}`}
                subtitle={hasGridImage ? `${analysis.edges_x?.length || 0}×${analysis.edges_y?.length || 0} cells` : `indexed_image_data: ${analysis.indexed_image_data?.length || 0}`}
                onClick={() => hasGridImage && setExpandedChart('grid')}
                disabled={!hasGridImage}
              >
                {hasGridImage ? (
                  <ZoomableImage 
                    width={analysis.indexed_image_w!} 
                    height={analysis.indexed_image_h!}
                    renderPixels={(w, h) => {
                      const data = new Uint8ClampedArray(w * h * 4);
                      const bytes = analysis.indexed_image_data!;
                      for (let i = 0; i < w * h; i++) {
                        data[i * 4] = bytes[i * 3] || 0;
                        data[i * 4 + 1] = bytes[i * 3 + 1] || 0;
                        data[i * 4 + 2] = bytes[i * 3 + 2] || 0;
                        data[i * 4 + 3] = 255;
                      }
                      return data;
                    }}
                    overlay={(ctx, w, h) => {
                      if (analysis.edges_x && analysis.edges_y) {
                        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                        ctx.lineWidth = 0.5;
                        for (const x of analysis.edges_x) {
                          ctx.beginPath();
                          ctx.moveTo(x, 0);
                          ctx.lineTo(x, h);
                          ctx.stroke();
                        }
                        for (const y of analysis.edges_y) {
                          ctx.beginPath();
                          ctx.moveTo(0, y);
                          ctx.lineTo(w, y);
                          ctx.stroke();
                        }
                      }
                    }}
                    maxSize={130}
                  />
                ) : <NoData label={`indexed_image_data: ${analysis.indexed_image_data?.length || 'missing'}`} />}
              </ChartCard>
              <ChartCard 
                title={`Result ${sprite.width}×${sprite.height}`}
                subtitle={`${countColors(sprite)} colors${sprite.centered_x ? ' [X-sym]' : ''}${sprite.centered_y ? ' [Y-sym]' : ''}`}
                onClick={() => setExpandedChart('sprite')}
              >
                <ZoomableImage 
                  width={sprite.width} 
                  height={sprite.height}
                  renderPixels={() => sprite.sprite_data}
                  maxSize={130}
                  checkered
                />
              </ChartCard>
            </div>
            
            {/* Row 2: Interactive Charts */}
            <div className="grid grid-cols-3 gap-3">
              <ChartCard 
                title={`X Spacing: ${sprite.grid_size_x.toFixed(2)}px`}
                subtitle={`err=${analysis.error_x.toFixed(4)}, ${analysis.peak_counts_x?.[analysis.best_index_x] || '?'} peaks`}
                onClick={() => setExpandedChart('spacingX')}
              >
                <SpacingChart data={analysis} axis="x" />
              </ChartCard>
              <ChartCard 
                title={`Y Spacing: ${sprite.grid_size_y.toFixed(2)}px`}
                subtitle={`err=${analysis.error_y.toFixed(4)}, ${analysis.peak_counts_y?.[analysis.best_index_y] || '?'} peaks`}
                onClick={() => setExpandedChart('spacingY')}
              >
                <SpacingChart data={analysis} axis="y" />
              </ChartCard>
              <ChartCard 
                title="Edge Profiles"
                subtitle={`X: ${analysis.profile_x?.length || 0}px, Y: ${analysis.profile_y?.length || 0}px`}
                onClick={() => setExpandedChart('profiles')}
              >
                <div className="flex flex-col gap-2 w-full h-full">
                  <ProfileChart profile={analysis.profile_x} edges={analysis.edges_x} label="X" small />
                  <ProfileChart profile={analysis.profile_y} edges={analysis.edges_y} label="Y" small />
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </div>

      {/* Expanded Modal - stops propagation to prevent closing analysis panel */}
      {expandedChart && (
        <ExpandedModal 
          chartId={expandedChart} 
          sprite={sprite} 
          analysis={analysis}
          hasEdgeImages={!!hasEdgeImages}
          hasGridImage={!!hasGridImage}
          onClose={() => setExpandedChart(null)} 
        />
      )}
    </div>
  );
};

// Header
const Header: React.FC<{ onBack: () => void; showRawData: boolean; setShowRawData: (v: boolean) => void }> = ({ onBack, showRawData, setShowRawData }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-[#252526] border-b border-[#3e3e42]">
    <button onClick={onBack} className="text-gray-400 hover:text-white p-1 hover:bg-[#3e3e42] rounded">
      <Icons.ChevronLeft />
    </button>
    <h3 className="text-sm font-bold text-white">Analysis Report</h3>
    <span className="text-xs text-gray-500 flex-1">Click to enlarge • Scroll to zoom</span>
    <button 
      onClick={() => setShowRawData(!showRawData)}
      className={`text-xs px-2 py-1 rounded ${showRawData ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'}`}
    >
      Raw Data
    </button>
  </div>
);

// Expanded modal
const ExpandedModal: React.FC<{
  chartId: string;
  sprite: SpriteResult;
  analysis: SpriteAnalysis;
  hasEdgeImages: boolean;
  hasGridImage: boolean;
  onClose: () => void;
}> = ({ chartId, sprite, analysis, hasEdgeImages, hasGridImage, onClose }) => (
  <div 
    className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-6" 
    onClick={onClose}
    onKeyDown={e => e.key === 'Escape' && onClose()}
  >
    <div className="bg-[#252526] rounded-lg border border-[#3e3e42] p-4 max-w-5xl w-full h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <span className="text-sm text-white font-medium">
          {chartId === 'delta' && 'Color Deltas (H=Red, V=Green)'}
          {chartId === 'grid' && 'Quantized Image with Pixel Grid'}
          {chartId === 'sprite' && `Extracted Sprite ${sprite.width}×${sprite.height}`}
          {chartId === 'spacingX' && `X Spacing Optimization → ${sprite.grid_size_x.toFixed(2)}px`}
          {chartId === 'spacingY' && `Y Spacing Optimization → ${sprite.grid_size_y.toFixed(2)}px`}
          {chartId === 'profiles' && 'Edge Detection Profiles'}
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl px-2">&times;</button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        {chartId === 'delta' && hasEdgeImages && (
          <ZoomableImage 
            width={analysis.indexed_image_w!} 
            height={analysis.indexed_image_h!}
            renderPixels={(w, h) => {
              const data = new Uint8ClampedArray(w * h * 4);
              for (let i = 0; i < w * h; i++) {
                data[i * 4] = analysis.edges_image_x![i] || 0;
                data[i * 4 + 1] = analysis.edges_image_y![i] || 0;
                data[i * 4 + 2] = 0;
                data[i * 4 + 3] = 255;
              }
              return data;
            }}
            maxSize={500}
            interactive
          />
        )}
        {chartId === 'grid' && hasGridImage && (
          <ZoomableImage 
            width={analysis.indexed_image_w!} 
            height={analysis.indexed_image_h!}
            renderPixels={(w, h) => {
              const data = new Uint8ClampedArray(w * h * 4);
              const bytes = analysis.indexed_image_data!;
              for (let i = 0; i < w * h; i++) {
                data[i * 4] = bytes[i * 3] || 0;
                data[i * 4 + 1] = bytes[i * 3 + 1] || 0;
                data[i * 4 + 2] = bytes[i * 3 + 2] || 0;
                data[i * 4 + 3] = 255;
              }
              return data;
            }}
            overlay={(ctx, w, h) => {
              if (analysis.edges_x && analysis.edges_y) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                ctx.lineWidth = 1;
                for (const x of analysis.edges_x) {
                  ctx.beginPath();
                  ctx.moveTo(x, 0);
                  ctx.lineTo(x, h);
                  ctx.stroke();
                }
                for (const y of analysis.edges_y) {
                  ctx.beginPath();
                  ctx.moveTo(0, y);
                  ctx.lineTo(w, y);
                  ctx.stroke();
                }
              }
            }}
            maxSize={500}
            interactive
          />
        )}
        {chartId === 'sprite' && (
          <ZoomableImage 
            width={sprite.width} 
            height={sprite.height}
            renderPixels={() => sprite.sprite_data}
            maxSize={500}
            checkered
            interactive
          />
        )}
        {chartId === 'spacingX' && (
          <ZoomableSVG baseWidth={700} baseHeight={300}>
            {(w, h) => <SpacingChart data={analysis} axis="x" svgWidth={w} svgHeight={h} />}
          </ZoomableSVG>
        )}
        {chartId === 'spacingY' && (
          <ZoomableSVG baseWidth={700} baseHeight={300}>
            {(w, h) => <SpacingChart data={analysis} axis="y" svgWidth={w} svgHeight={h} />}
          </ZoomableSVG>
        )}
        {chartId === 'profiles' && (
          <ZoomableSVG baseWidth={700} baseHeight={340}>
            {(w, h) => (
              <div className="flex flex-col gap-2 h-full">
                <ProfileChart profile={analysis.profile_x} edges={analysis.edges_x} label="X" svgWidth={w} svgHeight={h * 0.5 - 8} />
                <ProfileChart profile={analysis.profile_y} edges={analysis.edges_y} label="Y" svgWidth={w} svgHeight={h * 0.5 - 8} />
              </div>
            )}
          </ZoomableSVG>
        )}
      </div>
    </div>
  </div>
);

// Raw Data Panel
const RawDataPanel: React.FC<{ analysis: SpriteAnalysis }> = ({ analysis }) => {
  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined) return 'null';
    if (v instanceof Uint8Array || v instanceof Uint8ClampedArray) return `Uint8Array(${v.length})`;
    if (Array.isArray(v)) return `[${v.slice(0, 5).map(x => typeof x === 'number' ? x.toFixed(2) : x).join(', ')}${v.length > 5 ? `, ... (${v.length} total)` : ''}]`;
    if (typeof v === 'number') return v.toFixed(4);
    return String(v);
  };

  const entries = Object.entries(analysis).map(([key, value]) => ({
    key,
    type: value === null ? 'null' : (value instanceof Uint8Array || value instanceof Uint8ClampedArray) ? 'Uint8Array' : Array.isArray(value) ? 'Array' : typeof value,
    length: (value instanceof Uint8Array || value instanceof Uint8ClampedArray) ? value.length : Array.isArray(value) ? value.length : undefined,
    value: formatValue(value),
  }));

  return (
    <div className="bg-[#1a1a1a] rounded border border-[#3e3e42] p-3 font-mono text-xs overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 border-b border-[#3e3e42]">
            <th className="text-left py-1 pr-4">Key</th>
            <th className="text-left py-1 pr-4">Type</th>
            <th className="text-left py-1 pr-4">Len</th>
            <th className="text-left py-1">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ key, type, length, value }) => (
            <tr key={key} className="border-b border-[#2a2a2a] hover:bg-[#252525]">
              <td className="py-1 pr-4 text-blue-400">{key}</td>
              <td className="py-1 pr-4 text-yellow-400">{type}</td>
              <td className="py-1 pr-4 text-gray-400">{length ?? '-'}</td>
              <td className="py-1 text-gray-300 break-all max-w-lg">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Card wrapper
const ChartCard: React.FC<{ title: string; subtitle?: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ title, subtitle, onClick, disabled, children }) => (
  <div 
    className={`bg-[#252526] rounded border border-[#3e3e42] p-2 flex flex-col transition-colors ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-blue-500/50'}`}
    onClick={disabled ? undefined : onClick}
  >
    <div className="text-[11px] text-gray-300 font-medium truncate">{title}</div>
    {subtitle && <div className="text-[9px] text-gray-500 truncate">{subtitle}</div>}
    <div className="flex-1 min-h-[120px] flex items-center justify-center overflow-hidden mt-1">
      {children}
    </div>
  </div>
);

const NoData: React.FC<{ label?: string }> = ({ label }) => (
  <div className="text-gray-500 text-xs text-center">
    <div>No data</div>
    {label && <div className="text-[10px] mt-1 text-gray-600">{label}</div>}
  </div>
);

function countColors(sprite: SpriteResult): number {
  const colors = new Set<string>();
  for (let i = 0; i < sprite.width * sprite.height; i++) {
    const a = sprite.sprite_data[i * 4 + 3];
    if (a > 0) colors.add(`${sprite.sprite_data[i * 4]},${sprite.sprite_data[i * 4 + 1]},${sprite.sprite_data[i * 4 + 2]}`);
  }
  return colors.size;
}

// Zoomable Image component with scroll-to-zoom
const ZoomableImage: React.FC<{
  width: number;
  height: number;
  renderPixels: (w: number, h: number) => Uint8ClampedArray | Uint8Array;
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  maxSize: number;
  checkered?: boolean;
  interactive?: boolean;
}> = ({ width, height, renderPixels, overlay, maxSize, checkered, interactive }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });

  // For non-interactive (thumbnail), use simple scale
  const thumbScale = Math.min(maxSize / width, maxSize / height);

  // Watch container size and auto-fit
  useEffect(() => {
    if (!interactive || !containerRef.current) return;
    
    let initialized = false;
    
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setContainerSize({ w: rect.width, h: rect.height });
        // Auto-fit on first valid size
        if (!initialized) {
          const fit = Math.min(rect.width * 0.9 / width, rect.height * 0.9 / height);
          setZoom(fit);
          setPan({ x: 0, y: 0 });
          initialized = true;
        }
      }
    };
    
    // Use requestAnimationFrame to wait for layout
    requestAnimationFrame(() => {
      updateSize();
    });
    
    // Watch for resize
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [interactive, width, height]);

  const fitZoom = Math.min(containerSize.w * 0.9 / width, containerSize.h * 0.9 / height);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    const pixels = renderPixels(width, height);
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(pixels);
    ctx.putImageData(imgData, 0, 0);
    if (overlay) overlay(ctx, width, height);
  }, [width, height, renderPixels, overlay]);

  const handleFit = useCallback(() => {
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, [fitZoom]);

  const handleZoomStep = useCallback((direction: 'in' | 'out') => {
    setZoom(z => {
      const newZ = direction === 'in' ? z * 1.5 : z / 1.5;
      return Math.max(0.1, Math.min(64, newZ));
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.1, Math.min(64, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Non-interactive thumbnail
  if (!interactive) {
    return (
      <canvas 
        ref={canvasRef}
        style={{ 
          width: width * thumbScale, 
          height: height * thumbScale, 
          imageRendering: 'pixelated',
          background: checkered ? 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 8px 8px' : undefined,
        }}
      />
    );
  }

  // Interactive with controls - fills parent
  const displayW = width * zoom;
  const displayH = height * zoom;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-10 bg-[#252526] border border-[#3e3e42] rounded p-1 flex gap-1 shadow-lg items-center">
        <button onClick={() => handleZoomStep('out')} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white">
          <Icons.ZoomOut />
        </button>
        <button 
          onClick={handleFit} 
          className="text-xs font-mono px-2 w-16 text-center text-gray-300 hover:text-white hover:bg-[#3e3e42] rounded h-6 flex items-center justify-center"
          title="Fit"
        >
          {zoom.toFixed(2)}x
        </button>
        <button onClick={() => handleZoomStep('in')} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white">
          <Icons.ZoomIn />
        </button>
        <div className="w-[1px] h-4 bg-[#3e3e42] mx-1" />
        <button onClick={handleFit} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white" title="Fit">
          <Icons.Fit />
        </button>
      </div>

      {/* Canvas area */}
      <div 
        className="absolute inset-0 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas 
          ref={canvasRef}
          className="pointer-events-none"
          style={{ 
            width: displayW, 
            height: displayH, 
            imageRendering: 'pixelated',
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            background: checkered ? 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 8px 8px' : undefined,
          }}
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 pointer-events-none bg-black/30 px-2 py-1 rounded whitespace-nowrap">
          Drag to Pan | Wheel to Zoom
        </div>
      </div>
    </div>
  );
};

// Zoomable SVG wrapper for chart components
const ZoomableSVG: React.FC<{
  baseWidth: number;
  baseHeight: number;
  children: (width: number, height: number) => React.ReactNode;
}> = ({ baseWidth, baseHeight, children }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });

  // Watch container size and auto-fit
  useEffect(() => {
    if (!containerRef.current) return;
    
    let initialized = false;
    
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        setContainerSize({ w: rect.width, h: rect.height });
        // Auto-fit on first valid size
        if (!initialized) {
          const fit = Math.min(rect.width * 0.95 / baseWidth, rect.height * 0.95 / baseHeight);
          setZoom(fit);
          setPan({ x: 0, y: 0 });
          initialized = true;
        }
      }
    };
    
    requestAnimationFrame(() => {
      updateSize();
    });
    
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [baseWidth, baseHeight]);

  const fitZoom = Math.min(containerSize.w * 0.95 / baseWidth, containerSize.h * 0.95 / baseHeight);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(0.5, zoom * delta), 5);
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const displayW = baseWidth * zoom;
  const displayH = baseHeight * zoom;

  const handleZoomStep = (dir: 'in' | 'out') => {
    setZoom(z => Math.min(Math.max(0.5, dir === 'in' ? z * 1.2 : z / 1.2), 5));
  };

  const handleFit = () => {
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Zoom controls - same style as ZoomableImage */}
      <div className="absolute top-3 left-3 z-10 bg-[#252526] border border-[#3e3e42] rounded p-1 flex gap-1 shadow-lg items-center">
        <button onClick={() => handleZoomStep('out')} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white">
          <Icons.ZoomOut />
        </button>
        <button 
          onClick={handleFit} 
          className="text-xs font-mono px-2 w-16 text-center text-gray-300 hover:text-white hover:bg-[#3e3e42] rounded h-6 flex items-center justify-center"
          title="Fit"
        >
          {zoom.toFixed(2)}x
        </button>
        <button onClick={() => handleZoomStep('in')} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white">
          <Icons.ZoomIn />
        </button>
        <div className="w-[1px] h-4 bg-[#3e3e42] mx-1" />
        <button onClick={handleFit} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white" title="Fit">
          <Icons.Fit />
        </button>
      </div>

      {/* Content area */}
      <div 
        className="absolute inset-0 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="pointer-events-none"
          style={{ 
            width: displayW, 
            height: displayH,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          {children(displayW, displayH)}
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 pointer-events-none bg-black/30 px-2 py-1 rounded whitespace-nowrap">
          Drag to Pan | Wheel to Zoom
        </div>
      </div>
    </div>
  );
};

// Interactive Spacing Chart (SVG)
const SpacingChart: React.FC<{ data: SpriteAnalysis; axis: 'x' | 'y'; large?: boolean; svgWidth?: number; svgHeight?: number }> = ({ data, axis, large, svgWidth, svgHeight }) => {
  const [hover, setHover] = useState<number | null>(null);
  
  const spacings = axis === 'x' ? data.spacings_x : data.spacings_y;
  const errors = axis === 'x' ? data.errors_x : data.errors_y;
  const peakCounts = axis === 'x' ? data.peak_counts_x : data.peak_counts_y;
  const bestIndex = axis === 'x' ? data.best_index_x : data.best_index_y;
  
  const width = svgWidth ?? (large ? 700 : 300);
  const height = svgHeight ?? (large ? 300 : 120);
  const pad = { top: 30, right: 55, bottom: 35, left: 55 };
  
  const { points, minP, maxP, minS, maxS, maxE } = useMemo(() => {
    if (!spacings?.length) return { points: [], minP: 0, maxP: 1, minS: 0, maxS: 1, maxE: 1 };
    const minP = Math.min(...peakCounts);
    const maxP = Math.max(...peakCounts);
    const minS = Math.min(...spacings) * 0.95;
    const maxS = Math.max(...spacings) * 1.05;
    const maxE = Math.max(...errors) * 1.1;
    
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    
    const points = spacings.map((s, i) => ({
      x: pad.left + ((peakCounts[i] - minP) / (maxP - minP || 1)) * plotW,
      yS: pad.top + plotH - ((s - minS) / (maxS - minS || 1)) * plotH,
      yE: pad.top + plotH - (errors[i] / maxE) * plotH,
      spacing: s,
      error: errors[i],
      peaks: peakCounts[i],
      isBest: i === bestIndex,
    }));
    return { points, minP, maxP, minS, maxS, maxE };
  }, [spacings, errors, peakCounts, bestIndex, width, height]);

  if (!spacings?.length) return <NoData />;

  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const spacingPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yS}`).join(' ');
  const errorPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yE}`).join(' ');
  const bestPoint = points[bestIndex];

  return (
    <svg width={width} height={height} className="select-none mx-auto" onMouseLeave={() => setHover(null)}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad.left} x2={pad.left + plotW} y1={pad.top + plotH * t} y2={pad.top + plotH * t} stroke="#2a2a2a" />
      ))}
      
      {/* Axes */}
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + plotH} stroke="#444" />
      <line x1={pad.left} x2={pad.left + plotW} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#444" />
      
      {/* Curves */}
      <path d={spacingPath} fill="none" stroke="#f0c040" strokeWidth={2} />
      <path d={errorPath} fill="none" stroke="#ff6060" strokeWidth={2} />
      
      {/* Best line */}
      <line x1={bestPoint.x} x2={bestPoint.x} y1={pad.top} y2={pad.top + plotH} stroke="#40ff40" strokeWidth={1} strokeDasharray="4,4" />
      <circle cx={bestPoint.x} cy={bestPoint.yS} r={5} fill="#40ff40" />
      <circle cx={bestPoint.x} cy={bestPoint.yE} r={5} fill="#40ff40" />
      
      {/* Invisible hover zones - only show hovered point */}
      <rect 
        x={pad.left} y={pad.top} width={plotW} height={plotH} 
        fill="transparent" 
        className="cursor-crosshair"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const relX = x / plotW;
          // Find closest point
          let closest = 0;
          let minDist = Infinity;
          points.forEach((p, i) => {
            const dist = Math.abs((p.x - pad.left) / plotW - relX);
            if (dist < minDist) { minDist = dist; closest = i; }
          });
          setHover(closest);
        }}
      />
      
      {/* Only show hovered point (not best, that's already shown) */}
      {hover !== null && !points[hover].isBest && (
        <g>
          <circle cx={points[hover].x} cy={points[hover].yS} r={5} fill="#f0c040" />
          <circle cx={points[hover].x} cy={points[hover].yE} r={5} fill="#ff6060" />
        </g>
      )}
      
      {/* Labels */}
      <text x={pad.left + plotW / 2} y={height - 8} fill="#888" fontSize={11} textAnchor="middle">Peak Count</text>
      <text x={pad.left - 8} y={pad.top - 10} fill="#f0c040" fontSize={10} textAnchor="end">Size (px)</text>
      <text x={width - pad.right + 8} y={pad.top - 10} fill="#ff6060" fontSize={10}>Error</text>
      
      {/* Y axis ticks - Size */}
      {[0, 0.5, 1].map(t => (
        <text key={`s${t}`} x={pad.left - 8} y={pad.top + plotH * (1 - t) + 4} fill="#f0c040" fontSize={10} textAnchor="end">
          {(minS + (maxS - minS) * t).toFixed(1)}
        </text>
      ))}
      {/* Y axis ticks - Error */}
      {[0, 0.5, 1].map(t => (
        <text key={`e${t}`} x={width - pad.right + 8} y={pad.top + plotH * (1 - t) + 4} fill="#ff6060" fontSize={10}>
          {(maxE * t).toFixed(2)}
        </text>
      ))}
      
      {/* X axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <text key={`x${t}`} x={pad.left + plotW * t} y={pad.top + plotH + 18} fill="#666" fontSize={10} textAnchor="middle">
          {Math.round(minP + (maxP - minP) * t)}
        </text>
      ))}
      
      {/* Hover tooltip */}
      {hover !== null && points[hover] && (
        <g>
          <rect x={points[hover].x + 10} y={Math.max(pad.top, points[hover].yS - 45)} width={100} height={55} fill="#1a1a1a" stroke="#3e3e42" rx={4} />
          <text x={points[hover].x + 18} y={Math.max(pad.top, points[hover].yS - 45) + 15} fill="#888" fontSize={11}>peaks: {points[hover].peaks}</text>
          <text x={points[hover].x + 18} y={Math.max(pad.top, points[hover].yS - 45) + 30} fill="#f0c040" fontSize={11}>size: {points[hover].spacing.toFixed(2)}px</text>
          <text x={points[hover].x + 18} y={Math.max(pad.top, points[hover].yS - 45) + 45} fill="#ff6060" fontSize={11}>err: {points[hover].error.toFixed(4)}</text>
        </g>
      )}
      
      {/* Legend */}
      <rect x={pad.left + 10} y={pad.top + 8} width={10} height={10} fill="#f0c040" />
      <text x={pad.left + 24} y={pad.top + 17} fill="#888" fontSize={10}>Pixel Size</text>
      <rect x={pad.left + 10} y={pad.top + 22} width={10} height={10} fill="#ff6060" />
      <text x={pad.left + 24} y={pad.top + 31} fill="#888" fontSize={10}>Error</text>
    </svg>
  );
};

// Interactive Profile Chart (SVG)
const ProfileChart: React.FC<{ profile: number[]; edges: number[]; label: string; large?: boolean; small?: boolean; svgWidth?: number; svgHeight?: number }> = ({ profile, edges, label, large, small, svgWidth, svgHeight }) => {
  const [hoverX, setHoverX] = useState<number | null>(null);
  
  const width = svgWidth ?? (large ? 700 : 300);
  const height = svgHeight ?? (large ? 160 : (small ? 55 : 90));
  const pad = { top: 18, right: 15, bottom: small ? 8 : 25, left: 45 };
  
  const { points, maxVal } = useMemo(() => {
    if (!profile?.length) return { points: [], maxVal: 1 };
    const maxVal = Math.max(...profile);
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    
    const points = profile.map((v, i) => ({
      x: pad.left + (i / profile.length) * plotW,
      y: pad.top + plotH - (v / maxVal) * plotH,
      value: v,
      pos: i,
    }));
    return { points, maxVal };
  }, [profile, width, height]);

  if (!profile?.length) return <NoData />;

  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg 
      width={width} 
      height={height} 
      className="select-none block mx-auto"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pos = Math.round(((x - pad.left) / plotW) * profile.length);
        setHoverX(pos >= 0 && pos < profile.length ? pos : null);
      }}
      onMouseLeave={() => setHoverX(null)}
    >
      {/* Grid */}
      {!small && [0, 0.5, 1].map(t => (
        <line key={t} x1={pad.left} x2={pad.left + plotW} y1={pad.top + plotH * t} y2={pad.top + plotH * t} stroke="#2a2a2a" />
      ))}
      
      {/* Edge lines */}
      {edges.map((e, i) => {
        const x = pad.left + (e / profile.length) * plotW;
        return <line key={i} x1={x} x2={x} y1={pad.top} y2={pad.top + plotH} stroke="rgba(255,80,80,0.3)" />;
      })}
      
      {/* Profile curve */}
      <path d={path} fill="none" stroke="#f0c040" strokeWidth={1.5} />
      
      {/* Labels */}
      <text x={pad.left + 5} y={pad.top + 10} fill="#888" fontSize={11}>{label}</text>
      <text x={width - pad.right} y={pad.top + 10} fill="#ff6060" fontSize={10} textAnchor="end">{edges.length} edges</text>
      
      {/* Y ticks */}
      {!small && (
        <>
          <text x={pad.left - 8} y={pad.top + 4} fill="#666" fontSize={10} textAnchor="end">{maxVal.toFixed(1)}</text>
          <text x={pad.left - 8} y={pad.top + plotH + 4} fill="#666" fontSize={10} textAnchor="end">0</text>
        </>
      )}
      
      {/* X ticks */}
      {!small && [0, 0.5, 1].map(t => (
        <text key={t} x={pad.left + plotW * t} y={height - 5} fill="#666" fontSize={10} textAnchor="middle">
          {Math.round(profile.length * t)}
        </text>
      ))}
      
      {/* Hover */}
      {hoverX !== null && points[hoverX] && (
        <g>
          <line x1={points[hoverX].x} x2={points[hoverX].x} y1={pad.top} y2={pad.top + plotH} stroke="#666" strokeDasharray="2,2" />
          <circle cx={points[hoverX].x} cy={points[hoverX].y} r={4} fill="#f0c040" />
          <rect x={Math.min(points[hoverX].x + 8, width - 90)} y={points[hoverX].y - 25} width={80} height={22} fill="#1a1a1a" stroke="#3e3e42" rx={3} />
          <text x={Math.min(points[hoverX].x + 14, width - 84)} y={points[hoverX].y - 9} fill="#f0c040" fontSize={11}>
            [{hoverX}] {profile[hoverX].toFixed(3)}
          </text>
        </g>
      )}
    </svg>
  );
};
