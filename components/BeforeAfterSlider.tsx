
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SpriteCanvas } from './SpriteCanvas';

export const BeforeAfterSlider: React.FC<{
  originalSrc: string | null;
  spriteData: Uint8Array;
  spriteWidth: number;
  spriteHeight: number;
  spriteContentX?: number;
  spriteContentY?: number;
  gridSizeX: number;
  gridSizeY: number;
  gridOriginX: number;
  gridOriginY: number;
  gridSpanW: number;
  gridSpanH: number;
  zoom: number;
  stretchOriginal?: boolean;
}> = ({ 
    originalSrc,
    spriteData, spriteWidth, spriteHeight,
    spriteContentX, spriteContentY,
    gridSizeX, gridSizeY,
    gridOriginX, gridOriginY, gridSpanW, gridSpanH,
    zoom,
    stretchOriginal = true
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [originalImageObj, setOriginalImageObj] = useState<HTMLImageElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load the full original image object once
  useEffect(() => {
    if (!originalSrc) return;
    const img = new Image();
    img.onload = () => setOriginalImageObj(img);
    img.src = originalSrc;
  }, [originalSrc]);

  // Draw the original image region that corresponds to the sprite
  useEffect(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !originalImageObj) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const contentOffsetX = (spriteContentX ?? 0) * gridSizeX;
    const contentOffsetY = (spriteContentY ?? 0) * gridSizeY;
    
    // Source position in original image
    const srcX = gridOriginX - contentOffsetX;
    const srcY = gridOriginY - contentOffsetY;
    
    // Source size depends on stretch mode
    let srcW: number, srcH: number;
    if (stretchOriginal) {
      // Use actual grid span - will be stretched to fit container
      srcW = gridSpanW + contentOffsetX;
      srcH = gridSpanH + contentOffsetY;
    } else {
      // Use theoretical sprite coverage - might not perfectly align
      srcW = spriteWidth * gridSizeX;
      srcH = spriteHeight * gridSizeY;
    }
    
    // Canvas size matches the source size (1:1), CSS will scale it
    const canvasW = Math.ceil(srcW);
    const canvasH = Math.ceil(srcH);
    
    if (canvas.width !== canvasW || canvas.height !== canvasH) {
        canvas.width = canvasW;
        canvas.height = canvasH;
    }
    
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(
        originalImageObj,
        srcX, srcY, srcW, srcH,
        0, 0, canvasW, canvasH
    );
  }, [originalImageObj, gridOriginX, gridOriginY, gridSpanW, gridSpanH, spriteWidth, spriteHeight, gridSizeX, gridSizeY, spriteContentX, spriteContentY, stretchOriginal]);

  const calculatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only Left Click
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    calculatePos(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    calculatePos(e.touches[0].clientX);
  };

  // Setup global event listeners for smooth dragging outside the container
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        e.preventDefault();
        calculatePos(e.clientX);
    };
    const handleUp = () => {
        isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging.current) return;
        e.preventDefault(); // Prevent scroll while dragging
        calculatePos(e.touches[0].clientX);
    };
    const handleTouchEnd = () => {
        isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [calculatePos]);

  // Each sprite pixel represents gridSizeX × gridSizeY original pixels
  const spriteCoversW = spriteWidth * gridSizeX;
  const spriteCoversH = spriteHeight * gridSizeY;

  // The container is sized to fit the full sprite
  const widthPx = spriteCoversW * zoom;
  const heightPx = spriteCoversH * zoom;

  // Scale for rendering sprite
  const scaleX = gridSizeX * zoom;
  const scaleY = gridSizeY * zoom;

  const bgStyle = {
      backgroundImage: `
          linear-gradient(45deg, #333 25%, transparent 25%), 
          linear-gradient(-45deg, #333 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #333 75%), 
          linear-gradient(-45deg, transparent 75%, #333 75%)`,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundColor: '#222'
  };

  return (
       <div 
         ref={containerRef}
         className="relative overflow-hidden shadow-2xl rounded-lg border border-[#3e3e42] select-none pointer-events-auto"
         style={{ width: widthPx, height: heightPx, ...bgStyle }}
         onMouseDown={handleMouseDown}
         onTouchStart={handleTouchStart}
         onClick={(e) => e.stopPropagation()}
       >
          {/* Layer 1: Original (Right Side / Background) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <canvas 
                 ref={originalCanvasRef}
                 className="absolute inset-0 w-full h-full pointer-events-none"
                 style={{
                     imageRendering: 'pixelated'
                 }}
             />
          </div>

          {/* Layer 2: Sprite Result (Left Side / Clipped) */}
          <div 
             className="absolute inset-0 pointer-events-none"
             style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
              <div className="relative w-full h-full">
                 {spriteData && (
                     <SpriteCanvas 
                         data={spriteData} 
                         width={spriteWidth} 
                         height={spriteHeight} 
                         style={{ 
                             width: spriteWidth * scaleX, 
                             height: spriteHeight * scaleY
                         }}
                         className="pointer-events-none" 
                     />
                 )}
              </div>
          </div>
          
           {/* Label for Original */}
           <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1 rounded backdrop-blur-sm pointer-events-none">Original</div>
           {/* Label for Processed */}
           <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1 rounded backdrop-blur-sm z-20">Processed</div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_5px_rgba(0,0,0,0.5)] z-10 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)"/></svg>
             </div>
          </div>
       </div>
  );
};
